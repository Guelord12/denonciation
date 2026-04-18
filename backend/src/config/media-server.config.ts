import NodeMediaServer from 'node-media-server';
import fs from 'fs';

// Chemin exact de FFmpeg
const FFMPEG_PATH = 'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe';

// Vérifier que FFmpeg existe
if (!fs.existsSync(FFMPEG_PATH)) {
  console.error(`❌ FFmpeg non trouvé à : ${FFMPEG_PATH}`);
  console.log('Veuillez vérifier votre installation de FFmpeg');
  process.exit(1);
}

console.log(`✅ FFmpeg trouvé : ${FFMPEG_PATH}`);

const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000,
    mediaroot: './media',
    allow_origin: '*'
  },
  trans: {
    ffmpeg: FFMPEG_PATH,
    tasks: [
      {
        app: 'live',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
        hlsKeep: false,
        dash: true,
        dashFlags: '[f=dash:window_size=3:extra_window_size=5]',
        dashKeep: false,
        mp4: false,
        mp4Flags: '[movflags=frag_keyframe+empty_moov]',
      }
    ]
  },
  relay: {
    ffmpeg: FFMPEG_PATH,
    tasks: [
      {
        app: 'live',
        mode: 'push',
        edge: 'rtmp://127.0.0.1:1935',
      }
    ]
  },
  fission: {
    ffmpeg: FFMPEG_PATH,
    tasks: [
      {
        rule: "live/*",
        model: [
          {
            ab: "128k",
            vb: "1500k",
            vs: "1280x720",
            vf: "30",
          },
          {
            ab: "96k",
            vb: "800k",
            vs: "854x480",
            vf: "30",
          },
          {
            ab: "64k",
            vb: "400k",
            vs: "640x360",
            vf: "30",
          }
        ]
      }
    ]
  }
};

export const nms = new NodeMediaServer(config);