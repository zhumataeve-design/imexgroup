"""Build a reusable Russian greeting. Set ELEVENLABS_API_KEY in the build environment."""
import html
import json
import os
import re
import tempfile
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import quote

root = Path(__file__).resolve().parent / 'dist'
script = (root / 'index.html').read_text().split('id="speech">', 1)[1].split('</div>', 1)[0]
words = html.unescape(re.sub('<[^>]+>', '', script)).strip().replace('IMEX GROUP', 'Имэкс Групп')
voice = os.environ.get('ELEVENLABS_VOICE_ID', 'EXAVITQu4vr4xnSDxMaL')
url = 'https://api.elevenlabs.io/v1/text-to-speech/' + quote(voice, safe='') + '?output_format=mp3_44100_128'
payload = {'text': words, 'model_id': 'eleven_multilingual_v2', 'language_code': 'ru',
           'voice_settings': {'stability': .55, 'similarity_boost': .78, 'style': .15}}
request = Request(url, data=json.dumps(payload).encode(), headers={'Content-Type':'application/json',
                  'Accept':'audio/mpeg', 'xi-api-key':os.environ['ELEVENLABS_API_KEY']})
with urlopen(request, timeout=100) as response:
    audio = response.read()
if len(audio) < 4096:
    raise RuntimeError('Incomplete ElevenLabs audio')
with tempfile.NamedTemporaryFile(dir=root, delete=False) as file:
    file.write(audio)
    temporary = Path(file.name)
temporary.replace(root / 'welcome.mp3')
# The projection reads one volume value per 40 ms of the finished recording.
import array
import math
import subprocess
pcm = subprocess.check_output(['ffmpeg','-v','error','-i',str(root/'welcome.mp3'),'-ar','8000','-ac','1','-f','s16le','-'])
samples = array.array('h')
samples.frombytes(pcm)
blocks = [samples[i:i+320] for i in range(0,len(samples),320)]
levels = [math.sqrt(sum(s*s for s in block)/len(block)) for block in blocks]
scale = sorted(levels)[int(.94*len(levels))] or 1
(root/'voice-levels.bin').write_bytes(bytes(round(255*min(1,x/scale)) for x in levels))
