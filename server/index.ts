import express, { application } from 'express';
import { config } from 'dotenv';
import http from 'http';
import { env } from 'process';
import * as fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';
import { raw } from 'body-parser';
import { Queue, QueueEvents, Job} from 'bullmq';
import { PrismaClient } from './generated/prisma';
import { Request, Response } from "express";
import { A } from 'ollama/dist/shared/ollama.f6b57f53';
const multer = require("multer")

type Input = {
  artistName: string;
  album: {
    name: string;
    albumArtUri: string;
    released: string;
  };
  track: {
    name: string;
    duration_ms: number;
    track_number: number;
  };
};

const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, 'uploads/'); // Set the folder where files will be saved
  },
  filename: (req: any, file: any, cb: any) => {
    const extension = path.extname(file.originalname);
    const filename = `${Date.now()}${extension}`;
    cb(null, filename);
  }
});

const upload = multer({ storage });

const conversionQueue = new Queue('convert', {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
})

const queueEvents = new QueueEvents('convert', { connection: {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
} });

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  // save job
  console.log("JOB FINISHED")
});

const prisma = new PrismaClient()

config();

const app = express();

const server = http.createServer(app);
const port = parseInt(process.env.PORT || '3000');

app.use(express.json());

async function getSpotifyAccessToken(): Promise<string> {
  const tokenUrl = 'https://accounts.spotify.com/api/token';

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', process.env.SPOTIFY_CLIENT_ID as string);
  params.append('client_secret', process.env.SPOTIFY_CLIENT_SECRET_ID as string);

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get token: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function fetchSpotifyPlaylist(playlistId: string, accessToken: string) {
  const url = `https://api.spotify.com/v1/playlists/${playlistId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Spotify API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data;
}

function deepObjectToMap(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(deepObjectToMap);
  } else if (obj !== null && typeof obj === 'object') {
    const map = new Map();
    for (const [key, value] of Object.entries(obj)) {
      map.set(key, deepObjectToMap(value));
    }
    return map;
  }
  return obj; // primitives stay the same
}

async function ensureArtistAlbumFolders(baseDir: string, artist: string, album: string) {
  const artistDir = path.join(baseDir, artist);
  const albumDir = path.join(artistDir, album);

  try {
    // Check/create artist folder
    try {
      await fsp.access(artistDir);
    } catch {
      console.log(`Creating artist folder: ${artistDir}`);
      await fsp.mkdir(artistDir);
    }

    // Check/create album folder
    try {
      await fsp.access(albumDir);
    } catch {
      console.log(`Creating album folder: ${albumDir}`);
      await fsp.mkdir(albumDir);
    }

  } catch (err) {
    console.error('Error creating folders:', err);
    throw err;
  }
}

export async function createOrGetMusicEntities(input: Input) {
  const { artistName, album, track } = input;
  let track_name: string = track["name"];
  let duration_ms: number = track["duration_ms"];
  let track_number: number = track["track_number"];

  let artistId: number = await createOrGetArtist(artistName);

  let albumId: number = await createOrGetAlbum({
    name: album.name,
    albumArtUri: album.albumArtUri,
    released: album.released,
    artistId: artistId
  })

  let trackId: number = await createOrGetTrack({
    name: track_name,
    albumId: albumId,
    artistId: artistId,
    duration_ms: duration_ms,
    track_number: track_number
  });

  return {artistId, albumId, trackId};
}

async function createOrGetArtist(artistName: string){
  let artist;
  try {
    artist = await prisma.artist.upsert({
      where: { name: artistName },
      update: {},
      create: {
        name: artistName,
        created: true,
      },
    });
  } catch (err: any) {
    if (err.code === 'P2002') {
      // Another request already created it — fetch the existing one
      artist = await prisma.artist.findUnique({
        where: { name: artistName },
      });
      if (!artist) {
        throw new Error(`Artist "${artistName}" was just created but could not be retrieved.`);
      }
    } else {
      throw err; // Unknown error — rethrow it
    }
  }

  return artist.id;
}

async function createOrGetAlbum(albumData: {
  name: string;
  albumArtUri: string;
  released: string;
  artistId: number;
}) {
  let album;
  try {
    album = await prisma.album.upsert({
      where: {
        name_artistId: {
          name: albumData.name,
          artistId: albumData.artistId,
        },
      },
      update: {},
      create: {
        name: albumData.name,
        albumArtUri: albumData.albumArtUri,
        released: albumData.released,
        artistId: albumData.artistId,
        created: true,
      },
    });
  } catch (err: any) {
    if (err.code === 'P2002') {
      // Race condition — fetch the existing album
      album = await prisma.album.findFirst({
        where: {
          name: albumData.name,
          artistId: albumData.artistId,
        },
      });
      if (!album) {
        throw new Error(
          `Album "${albumData.name}" was just created but could not be retrieved.`
        );
      }
    } else {
      throw err;
    }
  }
  return album.id;
}

async function createOrGetTrack(trackData: {
  name: string;
  albumId: number;
  artistId: number;
  duration_ms: number;
  track_number: number;
}) {
  let track;
  try {
    track = await prisma.track.upsert({
      where: {
        name_albumId_artistId: {
          name: trackData.name,
          albumId: trackData.albumId,
          artistId: trackData.artistId,
        },
      },
      update: {},
      create: {
        name: trackData.name,
        albumId: trackData.albumId,
        artistId: trackData.artistId,
        duration_ms: trackData.duration_ms,
        track_number: trackData.track_number,
        created: false,
      },
    });
  } catch (err: any) {
    if (err.code === 'P2002') {
      // Race condition — fetch the existing track
      track = await prisma.track.findFirst({
        where: {
          name: trackData.name,
          albumId: trackData.albumId,
          artistId: trackData.artistId,
        },
      });
      if (!track) {
        throw new Error(
          `Track "${trackData.name}" was just created but could not be retrieved.`
        );
      }
    } else {
      throw err;
    }
  }
  return track.id;
}

async function convertSong(track: Map<any, any>){
  track = track.get("track");
 
  let artist_name: string = track.get("artists")[0].get("name");
  let album_name: string = track.get("album").get("name");
  let album_art_uri: string = track.get("album").get("images")[0].get("url")
  let album_release_year: string = track.get("album").get("release_date")


  let track_name: string = track.get("name");
  let track_length: number = track.get("duration_ms");
  let track_number: number = track.get("track_number")

  await ensureArtistAlbumFolders("./Music", artist_name, album_name)
  
  let input: Input = {
    artistName: artist_name, 
    album: {
      name: album_name, 
      albumArtUri: album_art_uri, 
      released: album_release_year
    }, 
    track: {
      name: track_name,
      duration_ms: track_length,
      track_number: track_number
    }
  };

  let musicEntitiesReturn = await createOrGetMusicEntities(input)

  let trackId: number = musicEntitiesReturn.trackId;
  
  conversionQueue.add('convert', {id: trackId});
}

app.use((req, res, next) => {
  if (req.path.includes(".")) {
    res.redirect(process.env.ASSET_URL + req.path);
    return;
  }
  next();
});

app.post('/convert', async (req, res) => {
  const spotify_link = req.body.inputUrl

  let token = await getSpotifyAccessToken();

  let playlist_information = await fetchSpotifyPlaylist(spotify_link, token);

  let playlist_map = deepObjectToMap(playlist_information);

  let playlist_tracks: Array<any> = playlist_map.get("tracks").get("items");

  for (let i: number = 0; i < playlist_tracks.length; i++){
    await convertSong(playlist_tracks[i]);
  }
});

const stream = require('stream');

app.use('/upload', raw({ type: 'audio/mpeg', limit: '100mb' }));

app.post('/upload', upload.single('file'), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).send({ error: 'No file uploaded' });
    return;
  }

  try {
    const uploadedFilePath = req.file.path;
    console.log(`Received MP3 file, saved at ${uploadedFilePath}`);

    const { album_name, artist_name, track_name, trackID } = req.body;
    const trackId = parseInt(req.body.track_id, 10);

    if (!album_name || !artist_name || !track_name) {
      res.status(400).send({ error: 'Missing album, artist, or track name' });
      return;
    }

    // Build destination folder and file path
    const destinationFolder = path.join('Music', artist_name, album_name);
    const destinationFileName = `${track_name}-${artist_name}.mp3`;
    const destinationPath = path.join(destinationFolder, destinationFileName);

    // Make sure the destination folder exists
    await fs.promises.mkdir(destinationFolder, { recursive: true });

    // Move the uploaded file
    await fs.promises.rename(uploadedFilePath, destinationPath);

    console.log(`Moved and renamed file to ${destinationPath}`);
    res.status(200).send({ message: 'File uploaded and moved successfully!' });

    console.log(`Marking ${track_name} as completed`)

    await prisma.track.update({
      where: { id: trackId },
      data: { created: true },
    });
    
  
  } catch (err) {
    console.error('Error processing uploaded file:', err);
    res.status(500).send({ error: 'Failed to process uploaded file' });
  }
});

app.get("/gethistory", async (req, res) => {
  try {
    const tracks = await prisma.track.findMany({
      orderBy: {
        track_number: "asc",
      },
      include: {
        artist: true,
        album: true,
      },
    });

    const formattedTracks = tracks.map(track => ({
      id: track.id,
      name: track.name,
      duration_ms: track.duration_ms,
      track_number: track.track_number,
      created: track.created,
      artist: {
        id: track.artist.id,
        name: track.artist.name,
      },
      album: {
        id: track.album.id,
        name: track.album.name,
        albumArtUri: track.album.albumArtUri,
        released: track.album.released,
        artist: {
          id: track.artist.id,
          name: track.artist.name,
        }
      }
    }));

    res.json(formattedTracks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch track history" });
  }
});

app.get("/getalbums", async (req, res) => {
  try {
    const albums = await prisma.album.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        artist: true,
      },
    });

    const formattedAlbums = albums.map(album => ({
      id: album.id,
      name: album.name,
      albumArtUri: album.albumArtUri,
      released: album.released,
      artist: {
        id: album.artist.id,
        name: album.artist.name,
      }
    }));

    res.json(formattedAlbums);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch track history" });
  }
})

app.get("/getalbum", async (req: any, res: any) => {
  try {
    const albumId: number = parseInt(req.query.albumId as string, 10); // Ensure you use query or params to pass albumId.

    // Fetch the album by its ID
    const album = await prisma.album.findUnique({
      where: { id: albumId },
      include: {
        artist: true, // Include artist details
      }
    });

    // If album not found, return a 404 error
    if (!album) {
      return res.status(404).json({ error: "Album not found" });
    }

    // Fetch tracks associated with the album
    const tracks = await prisma.track.findMany({
      where: { albumId: albumId },
      orderBy: { track_number: "asc" },  // You can change to "desc" if desired
      include: {
        artist: true,  // Include artist for each track if needed
      }
    });

    // Format the album and tracks data
    const formattedAlbum = {
      id: album.id,
      name: album.name,
      albumArtUri: album.albumArtUri,
      released: album.released,
      artist: {
        id: album.artist.id,
        name: album.artist.name,
      },
      tracks: tracks.map((track) => ({
        id: track.id,
        name: track.name,
        duration_ms: track.duration_ms,
        track_number: track.track_number,
        artist: {
          id: track.artist.id,
          name: track.artist.name,
        }
      })),
    };

    res.json(formattedAlbum);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch album and track data" });
  }
});

app.get("/getsong", async (req: any, res: any) => {
  try {
    const trackId: number = parseInt(req.query.trackId as string, 10); // Ensure you use query or params to pass trackId.

    // Get track information from the database
    const track_info = await prisma.track.findUnique({
      where: { id: trackId },
    });

    if (!track_info) {
      return res.status(404).json({ error: "Track not found" });
    }

    const { name: track_name, artistId, albumId } = track_info;

    // Get album and artist information
    const album_info = await prisma.album.findUnique({
      where: { id: albumId },
    });
    const artist_info = await prisma.artist.findUnique({
      where: { id: artistId },
    });

    if (!album_info || !artist_info) {
      return res.status(404).json({ error: "Album or artist not found" });
    }

    const { name: album_name } = album_info;
    const { name: artist_name } = artist_info;

    // Build the file path
    const file_path = path.join(
      __dirname,
      "Music", // Assuming "Music" folder is at the root level of your project
      artist_name,
      album_name,
      `${track_name}-${artist_name}.mp3`
    );

    // Check if the file exists
    if (!fs.existsSync(file_path)) {
      return res.status(404).json({ error: "File not found" });
    }

    // Send the file to the client
    res.sendFile(file_path, (err: any) => {
      if (err) {
        console.error("Error sending file:", err);
        res.status(500).send("Failed to send file");
      }
    });

  } catch (error) {
    console.error("Error in /getsong endpoint:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/getartist", async (req: any, res: any) => {
  try {
    const artistId: number = parseInt(req.query.artistId as string, 10);

    const artist_info = await prisma.artist.findUnique({
      where: { id: artistId },
    });

    if (!artist_info) {
      return res.status(404).json({ error: "Artist not found" });
    }

    const albums = await prisma.album.findMany({
      where: { artistId: artistId },
      orderBy: { released: "desc" }, // Optional: sort albums by release date
    });

    const formattedArtist = {
      id: artist_info.id,
      name: artist_info.name,
      albums: albums.map((album) => ({
        id: album.id,
        name: album.name,
        albumArtUri: album.albumArtUri,
        released: album.released,
      })),
    };

    res.json(formattedArtist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch artist information" });
  }
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

app.get('*', (req, res) => {
  res.send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <link rel="icon" type="image/svg+xml" href="${process.env.ASSET_URL}/vite.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>React-Express Starter App</title>
        <script type="module">
          import RefreshRuntime from '${process.env.ASSET_URL}/@react-refresh'
          RefreshRuntime.injectIntoGlobalHook(window)
          window.$RefreshReg$ = () => {}
          window.$RefreshSig$ = () => (type) => type
          window.__vite_plugin_react_preamble_installed__ = true
        </script>
        <script type="module" src="${process.env.ASSET_URL}/@vite/client"></script>
        </head>
        <body>
        <div id="root"></div>
        <script type="module" src="${process.env.ASSET_URL}/src/main.tsx"></script>
      </body>
    </html>
    `);
}); 