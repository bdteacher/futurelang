import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '2mb' }));

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. AI English Assistant Endpoint
app.post('/api/ai/assistant', async (req, res) => {
  try {
    const { mode, grade, unit, prompt, studentLevel } = req.body;
    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Dịch vụ Gemini AI chưa được cấu hình GEMINI_API_KEY trong phần Settings > Secrets.',
      });
    }

    const systemInstruction = `Bạn là AI English Assistant của nền tảng FUTURE LANG – ENGLISH LEARNING PLATFORM, chuyên gia giảng dạy tiếng Anh THCS (Lớp 6, 7, 8, 9) theo chương trình GDPT 2018 - Sách giáo khoa Global Success.
Khối lớp hiện tại: Lớp ${grade || 6}.
Đơn vị bài học (Unit): ${unit || 'Unit 1'}.
Trình độ học sinh: ${studentLevel || 'A2'}.
Chế độ hỗ trợ: ${mode || 'general'}.
Hãy trả lời rõ ràng, sư phạm, thân thiện, song ngữ Anh - Việt, có cấu trúc mạch lạc, ví dụ thực tế sát chương trình Global Success và giải thích chi tiết.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: String(prompt || 'Hãy hướng dẫn học tiếng Anh hiệu quả.'),
      config: {
        systemInstruction,
      },
    });

    res.json({
      text: response.text || 'Không nhận được phản hồi từ hệ thống AI.',
    });
  } catch (error: any) {
    console.error('AI Assistant error:', error);
    res.status(500).json({
      error: error?.message || 'Lỗi khi kết nối với dịch vụ AI.',
    });
  }
});

// 2. AI Writing Evaluation Endpoint
app.post('/api/ai/writing-feedback', async (req, res) => {
  try {
    const { grade, unit, writingType, promptTopic, studentText } = req.body;
    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Dịch vụ Gemini AI chưa được cấu hình GEMINI_API_KEY trong Settings > Secrets.',
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Hãy chấm bài viết tiếng Anh của học sinh Lớp ${grade} (${unit}, dạng bài: ${writingType}).
Đề bài: ${promptTopic}
Bài làm của học sinh:
"""
${studentText}
"""`,
      config: {
        systemInstruction:
          'Bạn là giáo viên chấm thi Writing tiếng Anh THCS theo chương trình GDPT 2018 Global Success. Hãy phân tích kỹ lỗi ngữ pháp, chính tả, từ vựng, bố cục và nội dung, đồng thời chấm điểm trên thang 10.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.NUMBER, description: 'Overall score out of 10 (e.g. 8.5)' },
            grammarScore: { type: Type.NUMBER, description: 'Grammar score out of 10' },
            vocabularyScore: { type: Type.NUMBER, description: 'Vocabulary score out of 10' },
            organizationScore: { type: Type.NUMBER, description: 'Organization score out of 10' },
            contentScore: { type: Type.NUMBER, description: 'Content relevance score out of 10' },
            grammarCorrections: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of grammar and spelling mistakes with corrections in Vietnamese and English',
            },
            vocabularySuggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Better words or collocations appropriate for middle school Global Success',
            },
            structureFeedback: {
              type: Type.STRING,
              description: 'Feedback on coherence, cohesion, and layout in Vietnamese',
            },
            contentFeedback: {
              type: Type.STRING,
              description: 'Feedback on task fulfillment and ideas in Vietnamese',
            },
            improvedVersion: {
              type: Type.STRING,
              description: 'Polished model version of the student writing',
            },
          },
          required: [
            'overallScore',
            'grammarScore',
            'vocabularyScore',
            'organizationScore',
            'contentScore',
            'grammarCorrections',
            'vocabularySuggestions',
            'structureFeedback',
            'contentFeedback',
            'improvedVersion',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (error: any) {
    console.error('AI Writing Feedback error:', error);
    res.status(500).json({
      error: error?.message || 'Không thể chấm bài viết bằng AI lúc này.',
    });
  }
});

// 3. AI Speaking Evaluation Endpoint
app.post('/api/ai/speaking-feedback', async (req, res) => {
  try {
    const { grade, unit, topic, question, spokenTranscript, durationSeconds } = req.body;
    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Dịch vụ Gemini AI chưa được cấu hình GEMINI_API_KEY trong Settings > Secrets.',
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Đánh giá bài luyện nói tiếng Anh của học sinh Lớp ${grade} (${unit} - Chủ đề: ${topic}).
Câu hỏi: ${question}
Thời lượng nói: ${durationSeconds || 15} giây.
Nội dung bài nói (Transcript): "${spokenTranscript}"`,
      config: {
        systemInstruction:
          'Bạn là giám khảo chấm Speaking tiếng Anh THCS chương trình Global Success. Hãy đánh giá 4 tiêu chí Fluency, Pronunciation, Vocabulary, Grammar trên thang điểm 10 và đưa ra lời khuyên cụ thể bằng tiếng Việt.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.NUMBER },
            fluencyScore: { type: Type.NUMBER },
            pronunciationScore: { type: Type.NUMBER },
            vocabularyScore: { type: Type.NUMBER },
            grammarScore: { type: Type.NUMBER },
            strengths: { type: Type.STRING },
            pronunciationTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            upgradedResponse: { type: Type.STRING },
          },
          required: [
            'overallScore',
            'fluencyScore',
            'pronunciationScore',
            'vocabularyScore',
            'grammarScore',
            'strengths',
            'pronunciationTips',
            'upgradedResponse',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (error: any) {
    console.error('AI Speaking Feedback error:', error);
    res.status(500).json({
      error: error?.message || 'Không thể phân tích bài nói bằng AI lúc này.',
    });
  }
});

// 4. AI Quiz Generator for Teachers & Students
app.post('/api/ai/generate-quiz', async (req, res) => {
  try {
    const { grade, unit, focusSkill, count } = req.body;
    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Dịch vụ Gemini AI chưa được cấu hình GEMINI_API_KEY trong Settings > Secrets.',
      });
    }

    const numQuestions = Math.min(Math.max(Number(count) || 4, 2), 8);
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Tạo ${numQuestions} câu hỏi trắc nghiệm tiếng Anh chuẩn chương trình GDPT 2018 Global Success Lớp ${grade}, ${unit}, trọng tâm: ${focusSkill || 'Vocabulary & Grammar'}.`,
      config: {
        systemInstruction:
          'Tạo câu hỏi trắc nghiệm 4 lựa chọn (A, B, C, D) sát chương trình Global Success THCS, kèm giải thích chi tiết bằng tiếng Việt.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              correctIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
            },
            required: ['question', 'options', 'correctIndex', 'explanation'],
          },
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '[]').trim());
    res.json({ questions: parsed });
  } catch (error: any) {
    console.error('AI Quiz Generation error:', error);
    res.status(500).json({
      error: error?.message || 'Không thể tạo câu hỏi tự động lúc này.',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FUTURE LANG Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
