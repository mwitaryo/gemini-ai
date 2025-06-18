const express = require('express');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const PORT = process.env.PORT || 3000;

dotenv.config()

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: process.env.MODEL,
  generationConfig: { temperature: 0.5 }
});

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ dest: 'uploads/' });

app.get('/', (req, res) => {
  res.send('Gemini AI entry point');
});

app.post("/generate-text", async (req, res) => {
  const { prompt } = req.body;
  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    res.json({
      output: response
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

const imageToGenerativePart = (filePath) => ({
  inlineData: {
    data: fs.readFileSync(filePath).toString('base64'),
    mimeType: 'image/png',
  },
})

app.post("/generate-from-image", upload.single('image'), async (req, res) => {
  const prompt = req.body.prompt;
  const filePath = req.file.path
  const image = imageToGenerativePart(filePath);

  try {
    const result = await model.generateContent([prompt, image])
    const response = result.response.text();
    res.json({
      output: response
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  } finally {
    fs.unlinkSync(filePath)
  }
});

app.post("/generate-from-document", upload.single('document'), async (req, res) => {
  const filePath = req.file.path;
  const prompt = req.body.prompt || "Analyse the following document:"
  const buffer = fs.readFileSync(filePath);
  const base64Data = buffer.toString('base64');
  const mimeType = req.file.mimetype

  try {
    const documentPart = {
      inlineData: {
        data: base64Data,
        mimeType
      }
    }

    const result = await model.generateContent([prompt, documentPart])
    const response = result.response.text()
    res.json({
      output: response
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  } finally {
    fs.unlinkSync(filePath)
  }
});

app.post("/generate-from-audio", upload.single("audio"), async (req, res) => {
  const audioPath = req.file.path
  const prompt = req.body.prompt || "Transcribe or analyse the following audio:"
  const buffer = fs.readFileSync(audioPath)
  const base64Data = buffer.toString("base64")
  const mimeType = req.file.mimetype

  try {

    const audioPart = {
      inlineData: {
        data: base64Data,
        mimeType
      }
    }

    const result = await model.generateContent([prompt, audioPart])
    const response = result.response.text()
    res.json({
      output: response
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  } finally {
    fs.unlinkSync(audioPath)
  }
})

app.listen(PORT, () => {
  console.log('Server is running on port 3000');
});