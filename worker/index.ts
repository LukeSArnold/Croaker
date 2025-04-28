import { Worker } from "bullmq";
import { config } from "dotenv";
import { PrismaClient } from "./generated/prisma";
import path from 'path';
import os from 'os';
import ytdl from '@distube/ytdl-core';
import fs from 'fs';
import { promisify } from 'util';
import stream from 'stream';
import fluentFfmpeg from 'fluent-ffmpeg'; 
import FormData from 'form-data';
import fetch from 'node-fetch';

const pipeline = promisify(stream.pipeline);

const YouTubeSearchApi = require('youtube-search-api') as any;
const multer = require("multer") as any;

config();

const client = new PrismaClient();
const upload = multer({ dest: path.join(__dirname, 'uploads') });

type Song = {
  artist: string;
  track: string;
  duration_ms: number;
  [key: string]: any;
};

type SearchResult = Song & {
  link: string | null;
};

export async function convertSong(
  youtubeUrl: string,
  songName: string,
  albumName: string,
  artistName: string,
  coverArtUrl: string
): Promise<Buffer> {
  console.log("Starting conversion...");

  const tempDir = os.tmpdir();
  const tempAudioPath = path.join(tempDir, `audio-${Date.now()}.webm`);
  const tempMp3Path = path.join(tempDir, `converted-${Date.now()}.mp3`);
  const outputChunks: Buffer[] = [];

  // Step 1: Download audio and save fully
  console.log(`Downloading audio to temp file: ${tempAudioPath}`);
  const audioStream = ytdl(youtubeUrl, {
    filter: 'audioonly',
    highWaterMark: 1 << 25,
    requestOptions: {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    },
  });

  await pipeline(audioStream, fs.createWriteStream(tempAudioPath));
  console.log("Audio downloaded!");

  // Step 2: Download cover art
  // console.log("Downloading cover art...");
  // const coverArtRes = await fetch(coverArtUrl, {
  //   headers: {
  //     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',  // Example user-agent header
  //   },
  // });
  // if (!coverArtRes.ok) {
  //   throw new Error(`Failed to fetch cover art: ${coverArtRes.statusText}`);
  // }
  // console.log("FETCHED COVER ART RES")

  // const coverArtBuffer = Buffer.from(await coverArtRes.arrayBuffer());
  // const coverArtStream = new stream.PassThrough();
  // coverArtStream.end(coverArtBuffer);

  // Step 3: Convert saved audio file to MP3 and save output
  console.log("Starting FFmpeg MP3 conversion...");

  await new Promise<void>((resolve, reject) => {
    fluentFfmpeg()
      .input(tempAudioPath)
      .audioCodec('libmp3lame')
      .audioBitrate(192)
      .format('mp3')
      .outputOptions([
        `-metadata`, `title=${songName.replace(/ /g, '')}`,
        `-metadata`, `artist=${artistName.replace(/ /g, '')}`,
        `-metadata`, `album=${albumName.replace(/ /g, '')}`,
        '-id3v2_version', '3',
        '-map', '0:a',  // Assuming 0:a is the audio stream
        '-disposition:v:0', 'attached_pic',
      ])
      .on('start', (cmd) => {
        console.log('FFmpeg process started:', cmd);
      })
      .on('progress', (progress) => {
        console.log(`Processing: ${progress.percent?.toFixed(2)}% done`);
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        reject(err);
      })
      .on('end', () => {
        console.log('MP3 conversion finished.');
        resolve();
      })
      .save(tempMp3Path);
  });

  // Step 4: Read the finished MP3 into memory
  const finalMp3Buffer = await fs.promises.readFile(tempMp3Path);

  // Step 5: Optionally, copy it to /outputs folder too
  const outputsDir = path.join(__dirname, 'outputs');
  await fs.promises.mkdir(outputsDir, { recursive: true });
  const outputPath = path.join(outputsDir, `${songName}-${artistName}.mp3`);
  await fs.promises.copyFile(tempMp3Path, outputPath);
  console.log(`Copied MP3 to ${outputPath}`);

  // Step 6: Cleanup temp files
  try {
    await fs.promises.unlink(tempAudioPath);
    await fs.promises.unlink(tempMp3Path);
    console.log("Temp files deleted.");
  } catch (err) {
    console.error('Error cleaning up temp files:', err);
  }

  return finalMp3Buffer;
}


// Convert "3:45" to milliseconds
function minutesToMs(duration: string): number {
  const parts = duration.split(':').map(Number);
  if (parts.length === 2) {
    const [min, sec] = parts;
    return (min * 60 + sec) * 1000;
  } else if (parts.length === 3) {
    const [hr, min, sec] = parts;
    return (hr * 3600 + min * 60 + sec) * 1000;
  }
  return 0;
}

function withinBounds(ms1: number, ms2: number, allowance: number): boolean {
  const difference = Math.abs(ms1 - ms2);
  return difference < (allowance * 1000);
}

async function vetSearchResults(
  trackLength: number,
  searchString: string,
  searchDepth: number,
  logging = false
): Promise<string | null> {
  try {
    const result = await YouTubeSearchApi.GetListByKeyword(searchString, true, searchDepth);

    for (const video of result.items) {
      const title = video.title;
      const durationStr = video.length.simpleText;

      const videoLength = minutesToMs(durationStr);

      if (logging) {
        console.log("\n----------------------------------");
        console.log(`Vetting result: ${title}`);
        console.log(`Video length of ${title} is ${videoLength}ms`);
      }

      if (title.toLowerCase().includes('video') && withinBounds(trackLength, videoLength, 60)) {
        if (logging) console.log(`Found music video within bounds: ${title}`);
        return `https://www.youtube.com/watch?v=${video.id}`;
      }

      if (withinBounds(trackLength, videoLength, 60)) {
        if (logging) console.log(`Found general result within bounds: ${title}`);
        return `https://www.youtube.com/watch?v=${video.id}`;
      }
    }

    return null;
  } catch (err) {
    console.error("YouTube search failed:", err);
    return null;
  }
}

new Worker("convert", async (job) => {
  const trackID = job.data.id;
  let track_info;
  try {
    track_info = await client.track.findUnique({
      where: { id: trackID },
    });

    if (!track_info) {
      console.error(`Track with ID ${trackID} not found!`);
    } else {
      console.log("Track info:", track_info);
    }
  } catch (err) {
    console.error("Error finding track:", err);
  }

  const track_name = track_info?.name;
  const track_length = track_info?.duration_ms;
  const artist_id = track_info?.artistId;
  const album_id = track_info?.albumId;

  let artist_info;
  try {
    artist_info = await client.artist.findUnique({
      where: {id: artist_id}
    })
  } catch (err) {
    console.error("Error finding artist:", err);
  }

  let album_info;
  try {
    album_info = await client.album.findUnique({
      where: {id: album_id}
    })
  } catch (err) {
    console.error("Error finding album:", err);
  }

  let album_art_url = album_info?.albumArtUri;
  let album_name = album_info?.name;


  // finding youtube link
  const artist_name = artist_info?.name;
  let searchString = `${track_name} ${artist_name}`;
  let link = await vetSearchResults(track_length!, searchString, 10, true);

  console.log(`VIDEO FOUND ${link}`)
  const mp3AudioBuffer = await convertSong(link!, track_name!, album_name!, artist_name!, album_art_url!);
  console.log(`AUDIO RETURNED TO WORKER`)

  try {

    const filePath = path.join(__dirname, `outputs/${track_name}-${artist_name}.mp3`);

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));  // Append the file
    form.append('album_name', album_name);
    form.append('artist_name', artist_name);
    form.append('track_name', track_name);
    form.append('track_id', trackID.toString());

    const BASE_URL = process.env.SERVER_URL || 'http://host.docker.internal:3000';

    let response = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      body: form,
    });
    
    if (response.ok) {
      console.log('MP3 file uploaded successfully!');
    } else {
      console.error('Failed to upload MP3 file:', response.statusText);
    }
    
    // Clean up the temporary file
    fs.unlinkSync(filePath);
  
    console.log('Successfully posted MP3 buffer to server');
  } catch (error) {
    console.error('Error posting MP3 buffer to server:', error);
  }

}, {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
})
