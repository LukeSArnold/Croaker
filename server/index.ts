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

  await ensureArtistAlbumFolders("./music", artist_name, album_name)
  
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

  const uploadedFilePath = req.file.path; // Path to the saved file on disk
  console.log(`Received MP3 file, saved at ${uploadedFilePath}`);

  // Optionally process the file here or move it if needed
  // For example, you can move the file or process it using ffmpeg, etc.

  // Respond with a success message
  res.status(200).send({ message: 'File uploaded successfully!' });
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



// server.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
// });