# Step1 (optional): Record audio from microphone
# Requires: ffmpeg, portaudio, pyaudio, speechrecognition
# This function is NOT used by the Gradio app — audio comes from the browser.

import logging
from io import BytesIO

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


def record_audio(file_path, timeout=20, phrase_time_limit=None):
    import speech_recognition as sr
    from pydub import AudioSegment

    recognizer = sr.Recognizer()
    with sr.Microphone() as source:
        logging.info("Adjusting for ambient noise...")
        recognizer.adjust_for_ambient_noise(source, duration=1)
        logging.info("Start speaking now...")
        audio_data = recognizer.listen(source, timeout=timeout, phrase_time_limit=phrase_time_limit)
        logging.info("Recording complete.")
        wav_data = audio_data.get_wav_data()
        audio_segment = AudioSegment.from_wav(BytesIO(wav_data))
        audio_segment.export(file_path, format="mp3", bitrate="128k")
        logging.info(f"Audio saved to {file_path}")


# Step2: Convert audio to text (used by Gradio app)
import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

def transcribe_patient_voice(audio_filepath):
    groq_api_key = os.environ.get("GROQ_API_KEY")

    client = Groq(api_key=groq_api_key)
    with open(audio_filepath, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            file=audio_file,
            model=os.environ.get("WHISPER_MODEL", "whisper-large-v3"),
        )

    return transcription.text