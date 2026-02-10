import { GoogleGenAI, Type } from "@google/genai";
import { UniversityReport } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Schema for Report Extraction
const reportSchema = {
  type: Type.OBJECT,
  properties: {
    unitName: { type: Type.STRING, description: "Tên Khoa hoặc Viện báo cáo" },
    academicYear: { type: Type.STRING, description: "Năm học hoặc năm báo cáo" },
    personnel: {
      type: Type.OBJECT,
      properties: {
        professors: { type: Type.NUMBER, description: "Số lượng Giáo sư (GS)" },
        associateProfessors: { type: Type.NUMBER, description: "Số lượng Phó Giáo sư (PGS)" },
        phd: { type: Type.NUMBER, description: "Số lượng Tiến sĩ (TS)" },
        masters: { type: Type.NUMBER, description: "Số lượng Thạc sĩ (ThS)" },
      },
    },
    publications: {
      type: Type.OBJECT,
      properties: {
        isi: { type: Type.NUMBER, description: "Số bài báo thuộc danh mục ISI/WoS" },
        scopus: { type: Type.NUMBER, description: "Số bài báo thuộc danh mục Scopus" },
        domestic: { type: Type.NUMBER, description: "Số bài báo trên tạp chí trong nước" },
        otherInternational: { type: Type.NUMBER, description: "Số bài báo quốc tế khác" },
      },
    },
    projects: {
      type: Type.OBJECT,
      properties: {
        assigned: { type: Type.NUMBER, description: "Số đề tài được giao mới/đăng ký mới" },
        ongoing: { type: Type.NUMBER, description: "Số đề tài đang thực hiện" },
        completed: { type: Type.NUMBER, description: "Số đề tài đã nghiệm thu" },
      },
    },
    qualitative: {
      type: Type.OBJECT,
      properties: {
        researchDirections: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Danh sách các hướng nghiên cứu chính" 
        },
        difficulties: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Các khó khăn, vướng mắc gặp phải" 
        },
        proposals: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Các kiến nghị, đề xuất" 
        },
      },
    },
  },
  required: ["unitName", "academicYear", "personnel", "publications", "projects", "qualitative"],
};

export const extractReportData = async (text: string, promptTemplate?: string): Promise<Partial<UniversityReport>> => {
  try {
    let finalPrompt = '';
    
    if (promptTemplate) {
      finalPrompt = promptTemplate.replace('{{text}}', text);
    } else {
      finalPrompt = `Phân tích văn bản báo cáo hành chính sau đây và trích xuất dữ liệu thống kê vào định dạng JSON.
      
      Văn bản báo cáo:
      ${text}`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: finalPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: reportSchema,
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");
    
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Extraction error:", error);
    throw error;
  }
};

export const analyzeTrend = async (reports: UniversityReport[], query: string, promptTemplate?: string): Promise<string> => {
  try {
    // Prepare a summary of data for the AI context
    const dataSummary = reports.map(r => ({
      unit: r.unitName,
      year: r.academicYear,
      publications: r.publications,
      personnel: r.personnel,
      directions: r.qualitative.researchDirections
    }));

    const dataString = JSON.stringify(dataSummary, null, 2);
    let finalPrompt = '';

    if (promptTemplate) {
      finalPrompt = promptTemplate
        .replace('{{data}}', dataString)
        .replace('{{query}}', query);
    } else {
      finalPrompt = `Bạn là một chuyên gia phân tích dữ liệu đại học (UniData Analyst). 
      Dưới đây là dữ liệu tổng hợp từ các báo cáo của các đơn vị trong trường:
      ${dataString}

      Câu hỏi của người dùng: "${query}"

      Hãy phân tích dữ liệu trên để trả lời câu hỏi. Nếu là câu hỏi dự báo, hãy đưa ra lập luận dựa trên xu hướng dữ liệu hiện tại. Trả lời bằng tiếng Việt chuyên nghiệp, ngắn gọn, súc tích.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: finalPrompt,
      config: {
        thinkingConfig: { thinkingBudget: 1024 }
      }
    });

    return response.text || "Không thể phân tích dữ liệu lúc này.";
  } catch (error) {
    console.error("Analysis error:", error);
    return "Đã xảy ra lỗi trong quá trình phân tích.";
  }
};

// --- Faculty Module Services ---

export const translateContent = async (text: string, targetLang: 'vi' | 'en', config?: any): Promise<string> => {
  try {
    const prompt = `Translate the following text to ${targetLang === 'vi' ? 'Vietnamese' : 'English'}. Return ONLY the translated text, no explanations. Text: "${text}"`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text?.trim() || text;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
};

export const importFacultyFromPdf = async (base64Pdf: string, config?: any): Promise<any> => {
  try {
    const prompt = `Extract faculty profile information from this CV document. 
    Return a JSON object matching the following structure (fields can be empty string if not found):
    {
      "name": { "vi": "", "en": "" },
      "rank": { "vi": "", "en": "" },
      "email": "",
      "tel": "",
      "educationList": [ { "year": "", "degree": {"vi": "", "en": ""}, "institution": {"vi": "", "en": ""} } ],
      "experience": { "vi": "0", "en": "0" },
      "careerStartYear": 2020
    }
    For bilingual fields, try to infer or translate if only one language is present.`;

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
            parts: [
                { inlineData: { mimeType: "application/pdf", data: base64Pdf } },
                { text: prompt }
            ]
        },
        config: { responseMimeType: "application/json" }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("PDF Extraction error:", error);
    return null;
  }
};
