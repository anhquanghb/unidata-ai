import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Faculty, FacultyTitles, FacultyTitle, FacultyListItem, Language, Course, Unit, HumanResourceRecord, PermissionProfile } from '../types';
import { Search, Plus, Trash2, Edit2, User, GraduationCap, Briefcase, Award, BookOpen, Layers, Star, Activity, Sparkles, Loader2, Phone, X, Download, Upload, Filter, Clock, Check, Fingerprint, Mail, ScrollText, FileJson, List, BarChart3, Settings, Medal, Building, Bot, Copy, ArrowRight, LayoutGrid, MoreHorizontal, MapPin, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { importFacultyFromPdf, translateContent } from '../services/geminiService';
// import { exportFacultyCvPdf } from '../services/FacultyExportPDF'; // Removed as file not provided, replaced with dummy
import AILoader from '../components/AILoader';
import FacultyStatisticsModule from './FacultyStatisticsModule';

interface FacultyModuleProps {
  faculties: Faculty[];
  setFaculties: React.Dispatch<React.SetStateAction<Faculty[]>>;
  facultyTitles: FacultyTitles;
  setFacultyTitles: React.Dispatch<React.SetStateAction<FacultyTitles>>;
  courses: Course[]; // For stats context
  geminiConfig: any; // Passed from App settings
  
  // Context for filtering
  units?: Unit[];
  humanResources?: HumanResourceRecord[];
  currentAcademicYear?: string;
  permission?: PermissionProfile; // New prop
}

// Define structure for conflicts found during import
interface ImportConflict {
    field: keyof FacultyTitles; // 'ranks', 'degrees', etc.
    label: string; // Display label like "Chức danh"
    value: string; // The value found in JSON
}

const FacultyModule: React.FC<FacultyModuleProps> = ({ 
    faculties, setFaculties, 
    facultyTitles, setFacultyTitles,
    courses, geminiConfig,
    units = [], humanResources = [], currentAcademicYear = '',
    permission
}) => {
  // UI Language State
  const [language, setLanguage] = useState<Language>('vi'); 
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // New State for View Toggle

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null); // For the full Profile Modal
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // -- Filters --
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'working' | 'left'>('working'); // Default to 'working'

  // Data Editing Language State (inside Modal)
  const [editLanguage, setEditLanguage] = useState<Language>('vi');
  
  // -- ID Inline Editing State --
  const [editingIdTarget, setEditingIdTarget] = useState<string | null>(null);
  const [tempIdValue, setTempIdValue] = useState('');

  // -- AI Prompt & Import Modal State --
  const [isAiImportModalOpen, setIsAiImportModalOpen] = useState(false);
  const [aiJsonInput, setAiJsonInput] = useState('');
  const [aiParsedData, setAiParsedData] = useState<Faculty[] | null>(null);
  const [aiImportError, setAiImportError] = useState<string | null>(null);
  
  // -- Import Conflicts & Mapping State --
  const [detectedConflicts, setDetectedConflicts] = useState<ImportConflict[]>([]);
  const [importMappings, setImportMappings] = useState<Record<string, string>>({}); // "field:value" -> "targetValue"

  // Refs for file inputs
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Main Module Tabs
  const [mainTab, setMainTab] = useState<'profiles' | 'stats' | 'categories'>('profiles');
  
  // Edit Form Tabs
  const [editFormTab, setEditFormTab] = useState<'info' | 'edu' | 'exp' | 'research' | 'achievements' | 'activities'>('info');

  // Categories Tab State
  const [categoryType, setCategoryType] = useState<keyof FacultyTitles>('degrees');

  // Sync edit language with UI language initially or when changed, if desired. 
  useEffect(() => {
      setEditLanguage(language);
  }, [language]);

  // Helper: Get academic year start year
  const currentYearStart = useMemo(() => {
      if (!currentAcademicYear) return new Date().getFullYear();
      const parts = currentAcademicYear.split('-');
      return parseInt(parts[0]) || new Date().getFullYear();
  }, [currentAcademicYear]);

  const filteredFaculties = useMemo(() => {
    let filtered = faculties;

    // 1. Filter by Search
    if (searchQuery) {
        filtered = filtered.filter(f => 
            (f.name[language] || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (f.email || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    // 2. Filter by Unit & Status
    filtered = filtered.filter(f => {
        // Get all HR records for this person
        const personRecords = humanResources.filter(hr => hr.facultyId === f.id);

        // Determine if person is "Active" in the current academic year context
        const isWorking = personRecords.some(hr => {
            const start = hr.startDate ? new Date(hr.startDate).getFullYear() : 0;
            const end = hr.endDate ? new Date(hr.endDate).getFullYear() : 9999;
            return end >= currentYearStart; 
        });

        // Status Filter
        if (statusFilter === 'working' && !isWorking) return false;
        if (statusFilter === 'left' && isWorking) return false;

        // Unit Filter
        if (selectedUnitFilter) {
            const relevantRecords = statusFilter === 'working' 
                ? personRecords.filter(hr => {
                    const end = hr.endDate ? new Date(hr.endDate).getFullYear() : 9999;
                    return end >= currentYearStart;
                }) 
                : personRecords;

            const inUnit = relevantRecords.some(hr => {
                return hr.unitId === selectedUnitFilter; 
            });
            
            if (!inUnit) return false;
        }

        return true;
    });

    // 3. Sort by Vietnamese Name (Last Word)
    return filtered.sort((a, b) => {
        const getNameParts = (name: string) => name.trim().split(/\s+/);
        const nameA = a.name[language] || a.name['en'] || '';
        const nameB = b.name[language] || b.name['en'] || '';
        
        const partsA = getNameParts(nameA);
        const partsB = getNameParts(nameB);
        
        const lastNameA = partsA[partsA.length - 1]?.toLowerCase() || '';
        const lastNameB = partsB[partsB.length - 1]?.toLowerCase() || '';

        return lastNameA.localeCompare(lastNameB, 'vi') || nameA.localeCompare(nameB, 'vi');
    });
  }, [faculties, searchQuery, language, selectedUnitFilter, statusFilter, humanResources, currentYearStart]);

  // --- Actions ---
  const handleAdd = () => {
    const newFaculty: Faculty = {
      id: `fac-${Date.now()}`,
      name: { vi: 'Nhân sự Mới', en: 'New Personnel' },
      rank: { vi: '', en: '' },
      degree: { vi: '', en: '' },
      academicTitle: { vi: '', en: '' },
      position: { vi: '', en: '' },
      experience: { vi: '0', en: '0' },
      careerStartYear: new Date().getFullYear(),
      workload: 0,
      mobile: '',
      office: '',
      officeHours: '',
      educationList: [],
      academicExperienceList: [],
      nonAcademicExperienceList: [],
      publicationsList: [],
      certificationsList: [],
      membershipsList: [],
      honorsList: [],
      serviceActivitiesList: [],
      professionalDevelopmentList: []
    };
    setFaculties(prev => [...prev, newFaculty]);
    setEditingId(newFaculty.id);
    setEditFormTab('info');
  };

  const handleDelete = (id: string) => {
    if (confirm(language === 'vi' ? "Xóa nhân sự này?" : "Delete this personnel?")) {
      setFaculties(prev => prev.filter(f => f.id !== id));
      if (editingId === id) setEditingId(null);
    }
  };

  // --- ID Management Actions ---
  const handleStartEditId = (id: string) => {
      setEditingIdTarget(id);
      setTempIdValue(id);
  };

  const handleSaveId = () => {
      if (!editingIdTarget) return;
      const newId = tempIdValue.trim();
      const oldId = editingIdTarget;

      if (!newId) {
          alert("ID cannot be empty.");
          return;
      }

      if (newId !== oldId) {
          if (faculties.some(f => f.id === newId)) {
              alert("ID already exists. Please choose a unique ID.");
              return;
          }

          if (confirm(language === 'vi' 
              ? `Bạn có chắc muốn đổi ID từ "${oldId}" sang "${newId}"?`
              : `Are you sure you want to change ID from "${oldId}" to "${newId}"?`)) {
              
              setFaculties(prev => prev.map(f => f.id === oldId ? { ...f, id: newId } : f));
              
              if (editingId === oldId) {
                  setEditingId(newId);
              }
          }
      }
      setEditingIdTarget(null);
  };

  const updateFaculty = (id: string, field: keyof Faculty, value: any) => {
    setFaculties(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };
  
  const updateFacultyLang = (id: string, field: keyof Faculty, lang: 'vi'|'en', value: string) => {
     setFaculties(prev => prev.map(f => {
          if (f.id !== id) return f;
          const current = f[field] as any;
          return { ...f, [field]: { ...current, [lang]: value } };
      }));
  };

  const handleTranslateProfile = async () => {
      const faculty = faculties.find(f => f.id === editingId);
      if (!faculty) return;
      
      setIsAiLoading(true);
      try {
          const targetLang = editLanguage === 'vi' ? 'en' : 'vi';
          const sourceLang = editLanguage;
          
          const translateList = async (list: FacultyListItem[]) => {
              return await Promise.all(list.map(async (item) => {
                  if (item.content[sourceLang] && !item.content[targetLang]) {
                      const translated = await translateContent(item.content[sourceLang], targetLang, geminiConfig);
                      return { ...item, content: { ...item.content, [targetLang]: translated || '' } };
                  }
                  return item;
              }));
          };

          const translatePubs = async (list: any[]) => {
               return await Promise.all(list.map(async (item) => {
                  if (item.text[sourceLang] && !item.text[targetLang]) {
                      const translated = await translateContent(item.text[sourceLang], targetLang, geminiConfig);
                      return { ...item, text: { ...item.text, [targetLang]: translated || '' } };
                  }
                  return item;
              }));
          };

          const newHonors = await translateList(faculty.honorsList);
          const newCerts = await translateList(faculty.certificationsList);
          const newMembers = await translateList(faculty.membershipsList);
          const newService = await translateList(faculty.serviceActivitiesList);
          const newDev = await translateList(faculty.professionalDevelopmentList);
          const newPubs = await translatePubs(faculty.publicationsList);

          const newName = faculty.name[targetLang] ? faculty.name[targetLang] : await translateContent(faculty.name[sourceLang], targetLang, geminiConfig);
          
          setFaculties(prev => prev.map(f => f.id === faculty.id ? {
              ...f,
              name: { ...f.name, [targetLang]: newName },
              honorsList: newHonors,
              certificationsList: newCerts,
              membershipsList: newMembers,
              serviceActivitiesList: newService,
              professionalDevelopmentList: newDev,
              publicationsList: newPubs
          } : f));
          alert(language === 'vi' ? "Đã dịch xong!" : "Translation complete!");
          
      } catch (e) {
          console.error(e);
          alert("Auto-translation failed.");
      } finally {
          setIsAiLoading(false);
      }
  };

  // --- Category Management Actions ---
  const addCategoryItem = () => {
      const newItem: FacultyTitle = {
          id: `${(categoryType as string).slice(0,3)}-${Date.now()}`,
          name: { vi: 'Mục mới', en: 'New Item' },
          abbreviation: { vi: '', en: '' }
      };
      setFacultyTitles(prev => ({
          ...prev,
          [categoryType]: [...prev[categoryType], newItem]
      }));
  };

  const updateCategoryItem = (id: string, field: 'name' | 'abbreviation', lang: 'vi' | 'en', value: string) => {
      setFacultyTitles(prev => ({
          ...prev,
          [categoryType]: prev[categoryType].map(item => 
              item.id === id ? { 
                  ...item, 
                  [field]: { ...(item[field] || { vi: '', en: '' }), [lang]: value } 
              } : item
          )
      }));
  };

  const deleteCategoryItem = (id: string) => {
      if (confirm(language === 'vi' ? "Xóa mục này?" : "Delete this item?")) {
          setFacultyTitles(prev => ({
              ...prev,
              [categoryType]: prev[categoryType].filter(item => item.id !== id)
          }));
      }
  };

  // --- AI IMPORT HANDLERS ---
  const handleCopyAiPrompt = () => {
      const validRanks = facultyTitles.ranks.map(r => JSON.stringify(r.name)).join(', ');
      const validDegrees = facultyTitles.degrees.map(r => JSON.stringify(r.name)).join(', ');
      const validAcademicTitles = facultyTitles.academicTitles.map(r => JSON.stringify(r.name)).join(', ');
      const validPositions = facultyTitles.positions.map(r => JSON.stringify(r.name)).join(', ');

      const prompt = `Bạn đóng vai trò là công cụ tạo dữ liệu giả lập chuẩn hóa cho hệ thống UniData.
Nhiệm vụ: Tạo mảng dữ liệu JSON hồ sơ giảng viên.

QUAN TRỌNG - RÀNG BUỘC DỮ LIỆU (VALIDATION RULES):
AI bắt buộc phải sử dụng chính xác các giá trị sau đây cho các trường tương ứng (chọn 1 cặp VI/EN phù hợp):

1. Chức danh (Rank): [${validRanks}]
2. Học vị (Degree): [${validDegrees}]
3. Học hàm (Academic Title): [${validAcademicTitles}] (Nếu không có, để chuỗi rỗng)
4. Vị trí (Position): [${validPositions}]

CẤU TRÚC JSON YÊU CẦU:
[
  {
    "name": { "vi": "Nguyễn Văn A", "en": "Nguyen Van A" },
    "email": "email_duy_nhat@domain.com",
    "rank": { "vi": "...", "en": "..." }, // Lấy từ danh sách trên
    "degree": { "vi": "...", "en": "..." }, // Lấy từ danh sách trên
    "academicTitle": { "vi": "...", "en": "..." }, // Lấy từ danh sách trên
    "position": { "vi": "...", "en": "..." }, // Lấy từ danh sách trên
    "experience": { "vi": "10", "en": "10" },
    "careerStartYear": 2014,
    "educationList": [
      {
        "id": "edu_random_string_1", // AI hãy tự sinh chuỗi ngẫu nhiên duy nhất
        "year": "2010",
        "degree": { "vi": "Cử nhân", "en": "Bachelor" },
        "institution": { "vi": "Đại học Bách Khoa", "en": "Polytechnic University" }
      }
    ],
    "mobile": "", //Số điện thoại di động
    "office": "", //Địa chỉ văn phòng
    "officeHours": "", //Giờ có mặt tại văn phòng
    "publicationsList": [
      {
        "id": "pub_random_string_2", // AI hãy tự sinh chuỗi ngẫu nhiên duy nhất
        "text": { "vi": "Tên bài báo...", "en": "Paper title..." }
      }
    ],
    "academicExperienceList": [
      {
        "id": "exp_random_string_3", // AI hãy tự sinh chuỗi ngẫu nhiên duy nhất
        "institution": {
          "vi": "", //Đơn vị mà người đó đã làm
          "en": ""
        },
        "title": {
          "vi": "Trợ giảng, giảng viên", //chức vụ
          "en": ""
        },
        "period": "2001-2007", // thời gian làm việc
        "isFullTime": true
      }
    ],
   "nonAcademicExperienceList": [
      {
        "company": {
          "vi": "", //Tên công ty
          "en": ""
        },
        "title": {
          "vi": "", //Vị trí
          "en": ""
        },
        "description": {
          "vi": "", //Mô tả công việc
          "en": ""
        },
        "period": "", //Thời gian làm việc từ năm - đến năm
        "isFullTime": true //Toàn thời gian hoặc bán thời gian true or false
      }
    ],
  "certificationsList": [
    {
      "id": "1771067921508", //ID tự sinh
      "content": {
        "vi": "", //Thông tin về chứng chỉ được cấp bao gồm tên chứng chỉ, loại chứng chỉ, tổ chức cấp chứng chỉ, thời gian và thời hạn
        "en": ""
      }
    }
  ],
  "membershipsList": [
    {
      "id": "1771067935935", //ID tự sinh
      "content": {
        "vi": "", //Thông tin về Hiệp hội Nghề nghiệp, tổ chức nghề nghiệp tham gia, thời gian và thời hạn
        "en": ""
      }
    }
  ],
  "honorsList": [
    {
      "id": "1771067907799", //ID tự sinh
      "content": {
        "vi": "", //Thông tin về Vinh danh & Giải thưởng, tổ chức cấp thưởng, thời gian
        "en": ""
      }
    }
  ],
  "serviceActivitiesList": [
    {
      "id": "1771067928159", //ID tự sinh
      "content": {
        "vi": "", //Các Hoạt động Phục vụ cộng đồng
        "en": ""
      }
    }
  ],
  "professionalDevelopmentList": [
    {
      "id": "1771067931384", //ID tự sinh
      "content": {
        "vi": "", //Thông tin về quá trình Phát triển Chuyên môn, ngày tháng năm và các thông tin khác nếu có
        "en": ""
      }
    }
  ]
 }
]
Hãy giải thích về dữ liệu mà bạn chuẩn bị tạo và hỏi tôi về việc tạo mã JSON. Nếu tôi đồng ý tạo mã JSON thì bạn chỉ trả về mã JSON hợp lệ, không thêm text giải thích.

Sau khi bạn hiểu yêu cầu trên, tôi sẽ cung cấp nội dung CV mà tôi cần tạo.`;

      navigator.clipboard.writeText(prompt).then(() => {
          alert("Đã sao chép Prompt vào bộ nhớ đệm! Hãy dán vào ChatGPT/Gemini.");
      });
  };

  const handleParseAiJson = () => {
      if (!aiJsonInput.trim()) {
          setAiImportError("Vui lòng nhập JSON.");
          return;
      }
      try {
          // Attempt to sanitize markdown code blocks
          let raw = aiJsonInput.trim();
          if (raw.startsWith('```json')) raw = raw.replace(/^```json/, '').replace(/```$/, '');
          else if (raw.startsWith('```')) raw = raw.replace(/^```/, '').replace(/```$/, '');
          
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) throw new Error("Dữ liệu phải là một mảng JSON (Array).");
          
          const hydrated: Faculty[] = parsed.map((item: any) => ({
              id: `fac-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              name: item.name || { vi: "No Name", en: "No Name" },
              rank: item.rank || { vi: "", en: "" },
              degree: item.degree || { vi: "", en: "" },
              academicTitle: item.academicTitle || { vi: "", en: "" },
              position: item.position || { vi: "", en: "" },
              experience: item.experience || { vi: "0", en: "0" },
              careerStartYear: item.careerStartYear || new Date().getFullYear(),
              email: item.email || "",
              mobile: item.mobile || "",
              office: item.office || "",
              officeHours: item.officeHours || "",
              educationList: Array.isArray(item.educationList) ? item.educationList : [],
              publicationsList: Array.isArray(item.publicationsList) ? item.publicationsList : [],
              academicExperienceList: Array.isArray(item.academicExperienceList) ? item.academicExperienceList : [],
              nonAcademicExperienceList: Array.isArray(item.nonAcademicExperienceList) ? item.nonAcademicExperienceList : [],
              certificationsList: Array.isArray(item.certificationsList) ? item.certificationsList : [],
              membershipsList: Array.isArray(item.membershipsList) ? item.membershipsList : [],
              honorsList: Array.isArray(item.honorsList) ? item.honorsList : [],
              serviceActivitiesList: Array.isArray(item.serviceActivitiesList) ? item.serviceActivitiesList : [],
              professionalDevelopmentList: Array.isArray(item.professionalDevelopmentList) ? item.professionalDevelopmentList : [],
              workload: 0,
          }));

          // --- ANALYZE CONFLICTS ---
          const conflicts: ImportConflict[] = [];
          const uniqueValues = new Set<string>();

          const checkConflict = (category: keyof FacultyTitles, label: string, valueObj: {vi: string, en: string}) => {
              // Only check VI for simplicity, or check both if available
              const val = valueObj.vi?.trim() || valueObj.en?.trim();
              if (!val) return;

              // Check if value exists in existing titles
              const exists = facultyTitles[category].some(t => 
                  t.name.vi.toLowerCase() === val.toLowerCase() || 
                  t.name.en.toLowerCase() === val.toLowerCase()
              );

              if (!exists) {
                  const key = `${category}:${val}`;
                  if (!uniqueValues.has(key)) {
                      uniqueValues.add(key);
                      conflicts.push({ field: category, label, value: val });
                  }
              }
          };

          hydrated.forEach(f => {
              checkConflict('ranks', 'Chức danh', f.rank);
              checkConflict('degrees', 'Học vị', f.degree);
              checkConflict('academicTitles', 'Học hàm', f.academicTitle);
              checkConflict('positions', 'Vị trí', f.position);
          });

          setDetectedConflicts(conflicts);
          setImportMappings({}); // Reset mappings
          setAiParsedData(hydrated);
          setAiImportError(null);
      } catch (e: any) {
          setAiImportError("Lỗi đọc JSON: " + e.message);
          setAiParsedData(null);
          setDetectedConflicts([]);
      }
  };

  const handleMappingChange = (field: string, value: string, targetValue: string) => {
      setImportMappings(prev => ({
          ...prev,
          [`${field}:${value}`]: targetValue
      }));
  };

  const handleConfirmAiImport = () => {
      if (aiParsedData) {
          // Apply mappings
          const finalData = aiParsedData.map(f => {
              const applyMap = (category: keyof FacultyTitles, originalObj: {vi: string, en: string}) => {
                  const val = originalObj.vi?.trim() || originalObj.en?.trim();
                  if (!val) return originalObj;
                  
                  const key = `${category}:${val}`;
                  const mappedTo = importMappings[key];

                  if (mappedTo === '__SKIP__') {
                      return { vi: '', en: '' }; // Clear it
                  }
                  
                  if (mappedTo) {
                      // Find the full object from system titles
                      const titleObj = facultyTitles[category].find(t => t.name.vi === mappedTo || t.name.en === mappedTo);
                      if (titleObj) return titleObj.name;
                  }
                  
                  return originalObj; // Keep original if no map or Keep selected
              };

              return {
                  ...f,
                  rank: applyMap('ranks', f.rank),
                  degree: applyMap('degrees', f.degree),
                  academicTitle: applyMap('academicTitles', f.academicTitle),
                  position: applyMap('positions', f.position)
              };
          });

          setFaculties(prev => [...prev, ...finalData]);
          setAiParsedData(null);
          setDetectedConflicts([]);
          setImportMappings({});
          setAiJsonInput('');
          setIsAiImportModalOpen(false);
          alert(`Đã nhập thành công ${finalData.length} hồ sơ nhân sự!`);
      }
  };

  // --- Imports & Exports ---
  const handleAiImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!editingId) return;

      setIsAiLoading(true);
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result.split(',')[1]) : reject(new Error("Failed"));
            reader.readAsDataURL(file);
        });
        const data = await importFacultyFromPdf(base64, geminiConfig);
        if (data) {
            setFaculties(prev => prev.map(f => {
                    if (f.id === editingId) {
                        return { ...f, ...data, id: f.id };
                    }
                    return f;
                })
            );
            alert(language === 'vi' ? "Đã cập nhật thông tin từ CV thành công!" : "Successfully updated profile from CV!");
        } else {
            alert("Failed to extract data from CV.");
        }
      } catch (err) {
          console.error(err);
          alert("Error processing PDF.");
      } finally {
          setIsAiLoading(false);
          e.target.value = '';
      }
  };

  const handleExportPdf = (faculty: Faculty) => {
      // Dummy export
      alert(language === 'vi' ? "Tính năng xuất PDF chưa được tích hợp (Cần thư viện jspdf)." : "Feature Export PDF is not implemented (Requires jspdf library).");
  };

  const handleExportJson = (faculty: Faculty) => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(faculty, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `CV_${faculty.name.vi.replace(/\s+/g, '_')}_${Date.now()}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const parsed = JSON.parse(event.target?.result as string);
              if (!parsed.name || !parsed.email) throw new Error("Invalid Faculty JSON");
              const newFaculty = { ...parsed, id: `fac-${Date.now()}` };
              setFaculties(prev => [...prev, newFaculty]);
              alert(language === 'vi' ? "Nhập CV thành công!" : "CV Imported Successfully!");
          } catch (err) {
              alert(language === 'vi' ? "Lỗi: File JSON không hợp lệ." : "Error: Invalid JSON file.");
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  // --- UI Translation Helpers ---
  const t = (vi: string, en: string) => language === 'vi' ? vi : en;

  // --- Render Components ---
  const RenderDynamicList = ({ title, items, field, icon: Icon, iconColor }: any) => {
      const faculty = faculties.find(f => f.id === editingId);
      if (!faculty) return null;
      return (
          <div className="mb-8 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-50">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2"><Icon size={18} className={iconColor}/> {title}</h4>
                  <button onClick={() => updateFaculty(faculty.id, field, [...items, { id: Date.now().toString(), content: { vi: '', en: '' } }])} className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-indigo-100 transition-colors"><Plus size={14}/> {editLanguage === 'vi' ? 'Thêm' : 'Add'}</button>
              </div>
              <div className="space-y-3">
                  {items.map((item: any, idx: number) => (
                      <div key={item.id} className="flex gap-2 items-center group">
                          <span className="text-[10px] font-bold text-slate-400 w-5 text-right flex-shrink-0">#{idx + 1}</span>
                          <div className="flex-1 relative">
                              <input className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all focus:bg-white" value={item.content[editLanguage]} onChange={e => { const newList = [...items]; newList[idx].content[editLanguage] = e.target.value; updateFaculty(faculty.id, field, newList); }} />
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                  {item.content[editLanguage === 'vi' ? 'en' : 'vi'] ? <span className="text-[8px] font-bold text-emerald-500 bg-emerald-50 px-1 rounded border border-emerald-100">OK</span> : <span className="text-[8px] font-bold text-amber-500 bg-amber-50 px-1 rounded border border-amber-100">--</span>}
                              </div>
                          </div>
                          <button onClick={() => updateFaculty(faculty.id, field, items.filter((_: any, i: number) => i !== idx))} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                      </div>
                  ))}
              </div>
          </div>
      );
  };

  const renderEditForm = () => {
      // ... (Same logic as existing, hidden for brevity as requested to only show changes but needs to be included for full file replacement)
      const faculty = faculties.find(f => f.id === editingId);
      if (!faculty) return null;

      const tabs = [
          { id: 'info', label: editLanguage === 'vi' ? 'Thông tin chung' : 'General Info', icon: User },
          { id: 'edu', label: editLanguage === 'vi' ? 'Đào tạo' : 'Education', icon: GraduationCap },
          { id: 'exp', label: editLanguage === 'vi' ? 'Kinh nghiệm' : 'Experience', icon: Briefcase },
          { id: 'research', label: editLanguage === 'vi' ? 'Nghiên cứu' : 'Research', icon: BookOpen },
          { id: 'achievements', label: editLanguage === 'vi' ? 'Thành tích' : 'Achievements', icon: Award },
          { id: 'activities', label: editLanguage === 'vi' ? 'Hoạt động' : 'Activities', icon: Activity },
      ];

      return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
                  <div className="flex justify-between items-center p-6 border-b border-slate-100">
                      <div>
                          <h3 className="text-xl font-bold text-slate-800">{editLanguage === 'vi' ? 'Hồ sơ nhân sự' : 'Personnel Profile'}</h3>
                          <div className="flex flex-col">
                              <p className="text-sm text-slate-500">{faculty.name[editLanguage] || faculty.name['vi']}</p>
                              {/* Inline ID Editing */}
                              <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                                  {editingIdTarget === faculty.id ? (
                                      <div className="flex items-center gap-1">
                                          <input className="w-32 bg-white border border-indigo-300 rounded px-1.5 py-0.5 text-[10px] font-mono text-indigo-700 outline-none" value={tempIdValue} onChange={(e) => setTempIdValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveId()} autoFocus />
                                          <button onClick={handleSaveId} className="p-0.5 bg-indigo-600 text-white rounded"><Check size={10}/></button>
                                          <button onClick={() => setEditingIdTarget(null)} className="p-0.5 bg-slate-300 text-slate-600 rounded"><X size={10}/></button>
                                      </div>
                                  ) : (
                                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 cursor-pointer hover:text-indigo-600" onDoubleClick={() => handleStartEditId(faculty.id)}><Fingerprint size={10}/> {faculty.id}</div>
                                  )}
                              </div>
                          </div>
                      </div>
                      <div className="flex gap-2 items-center">
                          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2">
                              <button onClick={() => setEditLanguage('vi')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${editLanguage === 'vi' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>VI</button>
                              <button onClick={() => setEditLanguage('en')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${editLanguage === 'en' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>EN</button>
                          </div>
                          <div className="flex gap-2 mr-2">
                              <input type="file" ref={pdfInputRef} className="hidden" accept=".pdf" onChange={handleAiImport} />
                              <button onClick={() => pdfInputRef.current?.click()} disabled={isAiLoading} className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-3 py-2 rounded-lg text-xs font-bold hover:bg-indigo-100 flex items-center gap-2"><ScrollText size={16}/> PDF</button>
                              <button onClick={handleTranslateProfile} disabled={isAiLoading} className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-3 py-2 rounded-lg text-xs font-bold hover:bg-indigo-100 flex items-center gap-2">{isAiLoading ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>} AI Translate</button>
                          </div>
                          <button onClick={() => handleExportJson(faculty)} className="px-3 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 flex items-center gap-2"><FileJson size={16}/> JSON</button>
                          <button onClick={() => handleExportPdf(faculty)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm"><Download size={16}/> PDF</button>
                          <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"><X size={24}/></button>
                      </div>
                  </div>

                  <div className="flex flex-1 overflow-hidden">
                      <div className="w-64 bg-slate-50 border-r border-slate-100 p-4 space-y-1">
                          {tabs.map(tab => (
                              <button key={tab.id} onClick={() => setEditFormTab(tab.id as any)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${editFormTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}><tab.icon size={18}/> {tab.label}</button>
                          ))}
                      </div>

                      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
                          {editFormTab === 'info' && (
                              <div className="space-y-6 max-w-3xl">
                                  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                                      <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><User size={18} className="text-indigo-600"/> {editLanguage === 'vi' ? 'Thông tin cá nhân' : 'Personal Info'} ({editLanguage.toUpperCase()})</h4>
                                       <div className="grid grid-cols-1 gap-4">
                                          <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{editLanguage === 'vi' ? 'Họ và tên' : 'Full Name'}</label><input className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg" value={faculty.name[editLanguage]} onChange={e => updateFacultyLang(faculty.id, 'name', editLanguage, e.target.value)} /></div>
                                          <div className="grid grid-cols-2 gap-4">
                                              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{editLanguage === 'vi' ? 'Chức danh' : 'Rank'}</label>
                                                  <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg" value={faculty.rank.en} onChange={e => { const s = facultyTitles.ranks.find(r => r.name.en === e.target.value); if (s) updateFaculty(faculty.id, 'rank', s.name); }}>
                                                      <option value="">{editLanguage === 'vi' ? 'Chọn...' : 'Choose...'}</option>{facultyTitles.ranks.map(r => <option key={r.id} value={r.name.en}>{r.name[editLanguage]}</option>)}
                                                  </select>
                                              </div>
                                              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{editLanguage === 'vi' ? 'Học vị' : 'Degree'}</label>
                                                  <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg" value={faculty.degree.en} onChange={e => { const s = facultyTitles.degrees.find(d => d.name.en === e.target.value); if (s) updateFaculty(faculty.id, 'degree', s.name); }}>
                                                      <option value="">{editLanguage === 'vi' ? 'Chọn...' : 'Choose...'}</option>{facultyTitles.degrees.map(d => <option key={d.id} value={d.name.en}>{d.name[editLanguage]}</option>)}
                                                  </select>
                                              </div>
                                              <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{editLanguage === 'vi' ? 'Học hàm' : 'Academic Title'}</label>
                                                  <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg" value={faculty.academicTitle.en} onChange={e => { const s = facultyTitles.academicTitles.find(t => t.name.en === e.target.value); if (s) updateFaculty(faculty.id, 'academicTitle', s.name); }}>
                                                      <option value="">{editLanguage === 'vi' ? 'Chọn...' : 'Choose...'}</option>{facultyTitles.academicTitles.map(t => <option key={t.id} value={t.name.en}>{t.name[editLanguage]}</option>)}
                                                  </select>
                                              </div>
                                               <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{editLanguage === 'vi' ? 'Vị trí công tác' : 'Position'}</label>
                                                  <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg" value={faculty.position.en} onChange={e => { const s = facultyTitles.positions.find(p => p.name.en === e.target.value); if (s) updateFaculty(faculty.id, 'position', s.name); }}>
                                                      <option value="">{editLanguage === 'vi' ? 'Chọn...' : 'Choose...'}</option>{facultyTitles.positions.map(p => <option key={p.id} value={p.name.en}>{p.name[editLanguage]}</option>)}
                                                  </select>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                                      <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Phone size={18} className="text-emerald-600"/> {editLanguage === 'vi' ? 'Liên hệ công tác' : 'Contact Info'}</h4>
                                      <div className="grid grid-cols-2 gap-4">
                                          <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Email</label><input className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg" value={faculty.email || ''} onChange={e => updateFaculty(faculty.id, 'email', e.target.value)} /></div>
                                          <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{editLanguage === 'vi' ? 'Điện thoại cơ quan' : 'Phone'}</label><input className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg" value={faculty.tel || ''} onChange={e => updateFaculty(faculty.id, 'tel', e.target.value)} /></div>
                                          <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{editLanguage === 'vi' ? 'Di động' : 'Mobile'}</label><input className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg" value={faculty.mobile || ''} onChange={e => updateFaculty(faculty.id, 'mobile', e.target.value)} /></div>
                                          <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{editLanguage === 'vi' ? 'Văn phòng' : 'Office'}</label><input className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg" value={faculty.office || ''} onChange={e => updateFaculty(faculty.id, 'office', e.target.value)} /></div>
                                          <div className="col-span-2"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{editLanguage === 'vi' ? 'Giờ ở văn phòng' : 'Office Hours'}</label><input className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg" value={faculty.officeHours || ''} onChange={e => updateFaculty(faculty.id, 'officeHours', e.target.value)} /></div>
                                      </div>
                                  </div>
                              </div>
                          )}
                          {editFormTab === 'edu' && (
                              <div className="space-y-4">
                                  {faculty.educationList.map((edu, idx) => (
                                      <div key={idx} className="p-4 bg-white rounded-xl border border-slate-200 relative group shadow-sm">
                                          <button onClick={() => updateFaculty(faculty.id, 'educationList', faculty.educationList.filter((_, i) => i !== idx))} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                                          <div className="grid grid-cols-6 gap-4">
                                              <div className="col-span-1"><label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">{editLanguage === 'vi' ? 'Năm' : 'Year'}</label><input className="w-full p-2 border border-slate-200 rounded text-sm bg-slate-50" value={edu.year} onChange={e => { const n = [...faculty.educationList]; n[idx].year = e.target.value; updateFaculty(faculty.id, 'educationList', n); }} /></div>
                                              <div className="col-span-2"><label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">{editLanguage === 'vi' ? 'Bằng cấp' : 'Degree'}</label><input className="w-full p-2 border border-slate-200 rounded text-sm font-semibold" value={edu.degree[editLanguage]} onChange={e => { const n = [...faculty.educationList]; n[idx].degree = {...n[idx].degree, [editLanguage]: e.target.value}; updateFaculty(faculty.id, 'educationList', n); }} /></div>
                                              <div className="col-span-3"><label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">{editLanguage === 'vi' ? 'Nơi đào tạo' : 'Institution'}</label><input className="w-full p-2 border border-slate-200 rounded text-sm" value={edu.institution[editLanguage]} onChange={e => { const n = [...faculty.educationList]; n[idx].institution = {...n[idx].institution, [editLanguage]: e.target.value}; updateFaculty(faculty.id, 'educationList', n); }} /></div>
                                          </div>
                                      </div>
                                  ))}
                                  <button onClick={() => updateFaculty(faculty.id, 'educationList', [...faculty.educationList, { id: Date.now().toString(), degree: { vi: '', en: '' }, discipline: { vi: '', en: '' }, institution: { vi: '', en: '' }, year: '' }])} className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:border-indigo-400 hover:text-indigo-600 flex items-center justify-center gap-2"><Plus size={16}/> {editLanguage === 'vi' ? 'Thêm quá trình đào tạo' : 'Add Education History'}</button>
                              </div>
                          )}
                          {editFormTab === 'exp' && (
                              <div className="space-y-8">
                                  <div>
                                      <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-200"><Clock size={18} className="text-amber-600"/> {editLanguage === 'vi' ? 'Tổng quan' : 'Overview'}</h4>
                                      <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-4 grid grid-cols-2 gap-6">
                                          <div><label className="text-xs font-bold text-amber-800 uppercase mb-1 block">{editLanguage === 'vi' ? 'Năm bắt đầu sự nghiệp' : 'Career Start Year'}</label><input type="number" className="w-full p-2.5 bg-white border border-amber-200 rounded-lg font-bold text-amber-900" value={faculty.careerStartYear || ''} onChange={e => { const startYear = parseInt(e.target.value); const diff = Math.max(0, new Date().getFullYear() - startYear); updateFaculty(faculty.id, 'experience', { vi: diff.toString(), en: diff.toString() }); updateFaculty(faculty.id, 'careerStartYear', startYear); }} /></div>
                                          <div className="flex flex-col justify-end pb-2"><span className="text-xs text-amber-700 font-medium">{editLanguage === 'vi' ? 'Kinh nghiệm:' : 'Experience:'}</span><span className="text-2xl font-black text-amber-900">{faculty.experience.vi || 0} {editLanguage === 'vi' ? 'năm' : 'years'}</span></div>
                                      </div>
                                  </div>
                                  <div><h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-200"><Briefcase size={18} className="text-indigo-600"/> {editLanguage === 'vi' ? 'Kinh nghiệm Học thuật' : 'Academic Experience'}</h4>
                                      <div className="space-y-3">{faculty.academicExperienceList.map((exp, idx) => (
                                          <div key={idx} className="p-4 bg-white rounded-xl border border-slate-200 relative group shadow-sm"><button onClick={() => updateFaculty(faculty.id, 'academicExperienceList', faculty.academicExperienceList.filter((_, i) => i !== idx))} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button><div className="grid grid-cols-4 gap-3"><div><label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">{editLanguage === 'vi' ? 'Giai đoạn' : 'Period'}</label><input className="w-full p-2 border border-slate-200 rounded text-sm bg-slate-50" value={exp.period} onChange={e => { const n = [...faculty.academicExperienceList]; n[idx].period = e.target.value; updateFaculty(faculty.id, 'academicExperienceList', n); }} /></div><div className="col-span-3 flex gap-2"><div className="flex-1"><label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">{editLanguage === 'vi' ? 'Nơi công tác' : 'Institution'}</label><input className="w-full p-2 border border-slate-200 rounded text-sm" value={exp.institution[editLanguage]} onChange={e => { const n = [...faculty.academicExperienceList]; n[idx].institution[editLanguage] = e.target.value; updateFaculty(faculty.id, 'academicExperienceList', n); }} /></div><div className="flex-1"><label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">{editLanguage === 'vi' ? 'Chức vụ' : 'Title'}</label><input className="w-full p-2 border border-slate-200 rounded text-sm" value={exp.title[editLanguage]} onChange={e => { const n = [...faculty.academicExperienceList]; n[idx].title[editLanguage] = e.target.value; updateFaculty(faculty.id, 'academicExperienceList', n); }} /></div></div></div></div>
                                      ))}<button onClick={() => updateFaculty(faculty.id, 'academicExperienceList', [...faculty.academicExperienceList, { id: Date.now().toString(), institution: { vi: '', en: '' }, rank: { vi: '', en: '' }, title: { vi: '', en: '' }, period: '', isFullTime: true }])} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"><Plus size={14}/> {editLanguage === 'vi' ? 'Thêm Kinh nghiệm' : 'Add Experience'}</button></div>
                                  </div>
                              </div>
                          )}
                          {editFormTab === 'research' && (
                              <div className="space-y-4">
                                  <div className="flex justify-between items-center border-b border-slate-100 pb-2"><h4 className="font-bold text-slate-700 flex items-center gap-2"><BookOpen size={18} className="text-indigo-600"/> {editLanguage === 'vi' ? 'Công bố Khoa học' : 'Publications'}</h4><button onClick={() => updateFaculty(faculty.id, 'publicationsList', [...(faculty.publicationsList || []), { id: Date.now().toString(), text: { vi: '', en: '' } }])} className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-indigo-100"><Plus size={14}/> {editLanguage === 'vi' ? 'Thêm' : 'Add'}</button></div>
                                  <div className="space-y-2">{(faculty.publicationsList || []).map((pub, idx) => (
                                      <div key={idx} className="flex gap-2 items-start group"><span className="text-xs font-bold text-slate-400 mt-2 w-6 text-right">{idx + 1}.</span><div className="flex-1 relative"><textarea className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm shadow-sm" rows={2} value={pub.text[editLanguage]} onChange={e => { const n = [...(faculty.publicationsList || [])]; n[idx].text[editLanguage] = e.target.value; updateFaculty(faculty.id, 'publicationsList', n); }} /><div className="absolute right-2 top-2">{pub.text[editLanguage === 'vi' ? 'en' : 'vi'] ? <span className="w-2 h-2 rounded-full bg-emerald-400 block"></span> : <span className="w-2 h-2 rounded-full bg-amber-400 block"></span>}</div></div><button onClick={() => updateFaculty(faculty.id, 'publicationsList', faculty.publicationsList!.filter((_, i) => i !== idx))} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity mt-1"><Trash2 size={16}/></button></div>
                                  ))}</div>
                              </div>
                          )}
                          {editFormTab === 'achievements' && <div className="space-y-8"><RenderDynamicList title={editLanguage === 'vi' ? 'Vinh danh & Giải thưởng' : 'Honors & Awards'} items={faculty.honorsList || []} field="honorsList" icon={Star} iconColor="text-amber-500" /><RenderDynamicList title={editLanguage === 'vi' ? 'Chứng chỉ' : 'Certifications'} items={faculty.certificationsList || []} field="certificationsList" icon={Medal} iconColor="text-emerald-500" /></div>}
                          {editFormTab === 'activities' && <div className="space-y-8"><RenderDynamicList title={editLanguage === 'vi' ? 'Hoạt động Phục vụ' : 'Service Activities'} items={faculty.serviceActivitiesList || []} field="serviceActivitiesList" icon={Layers} iconColor="text-blue-500" /><RenderDynamicList title={editLanguage === 'vi' ? 'Phát triển Chuyên môn' : 'Professional Development'} items={faculty.professionalDevelopmentList || []} field="professionalDevelopmentList" icon={Briefcase} iconColor="text-purple-500" /><RenderDynamicList title={editLanguage === 'vi' ? 'Hiệp hội Nghề nghiệp' : 'Memberships'} items={faculty.membershipsList || []} field="membershipsList" icon={User} iconColor="text-slate-500" /></div>}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderFilters = () => (
      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0 mb-6">
          <div className="flex justify-between items-start">
              <div className="flex gap-4 items-center flex-wrap">
                  {/* Search */}
                  <div className="relative w-64">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder={t("Tìm kiếm nhân sự...", "Search personnel...")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/>
                  </div>
                  
                  {/* Unit Filter */}
                  <div className="flex items-center gap-2">
                      <Filter size={16} className="text-slate-400"/>
                      <select 
                          className="bg-slate-50 border border-slate-200 rounded-lg text-sm p-2 outline-none focus:ring-2 focus:ring-indigo-500 max-w-[200px]"
                          value={selectedUnitFilter}
                          onChange={(e) => setSelectedUnitFilter(e.target.value)}
                      >
                          <option value="">{t("-- Tất cả Đơn vị --", "-- All Units --")}</option>
                          {units.filter(u => u.unit_type === 'faculty').map(u => (
                              <option key={u.unit_id} value={u.unit_id}>{u.unit_name}</option>
                          ))}
                      </select>
                  </div>

                  {/* Status Filter */}
                  <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                      <button 
                          onClick={() => setStatusFilter('working')} 
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${statusFilter === 'working' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}
                      >
                          {t("Đang làm việc", "Working")}
                      </button>
                      <button 
                          onClick={() => setStatusFilter('left')} 
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${statusFilter === 'left' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500'}`}
                      >
                          {t("Đã nghỉ", "Left/Retired")}
                      </button>
                      <button 
                          onClick={() => setStatusFilter('all')} 
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${statusFilter === 'all' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                      >
                          {t("Tất cả", "All")}
                      </button>
                  </div>
              </div>

              {/* Actions - Only for Profiles Tab */}
              {mainTab === 'profiles' && (
                  <div className="flex gap-2">
                      <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2">
                          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`} title="Grid View"><LayoutGrid size={16}/></button>
                          <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`} title="List View"><List size={16}/></button>
                      </div>
                      <button 
                          onClick={() => { setIsAiImportModalOpen(true); setAiParsedData(null); setAiJsonInput(''); setAiImportError(null); setDetectedConflicts([]); setImportMappings({}); }}
                          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-purple-700 shadow-sm"
                      >
                          <Bot size={16} /> {t("AI Hỗ trợ", "AI Assist")}
                      </button>
                      <input type="file" ref={jsonInputRef} className="hidden" accept=".json" onChange={handleImportJson} />
                      <button onClick={() => jsonInputRef.current?.click()} className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-50"><Upload size={16} /> {t("Nhập JSON", "Import")}</button>
                      <button onClick={handleAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-sm"><Plus size={16} /> {t("Thêm", "Add")}</button>
                  </div>
              )}
          </div>
          {/* Info bar about current context */}
          <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-3">
              <span className="flex items-center gap-1"><Clock size={12}/> Năm học hiện tại: <strong>{currentAcademicYear || 'N/A'}</strong></span>
              <span className="flex items-center gap-1"><Building size={12}/> Hiển thị: <strong>{filteredFaculties.length}</strong> nhân sự</span>
          </div>
      </div>
  );

  const renderGridView = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6">
          {filteredFaculties.map(faculty => {
              const rank = faculty.rank[language] || '';
              const degree = faculty.degree[language] || '';
              
              return (
              <div key={faculty.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col relative group overflow-hidden">
                  {/* Decorative Header */}
                  <div className={`h-2 w-full ${rank ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                  
                  <div className="p-5 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-4">
                          <div className="flex gap-3">
                              <div className="w-14 h-14 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-xl font-bold text-slate-500 uppercase flex-shrink-0">
                                  {faculty.name[language]?.charAt(0)}
                              </div>
                              <div className="flex flex-col justify-center">
                                  <h4 className="font-bold text-slate-800 text-sm line-clamp-1" title={faculty.name[language]}>{faculty.name[language]}</h4>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                      {rank && <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{rank}</span>}
                                      {degree && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">{degree}</span>}
                                  </div>
                              </div>
                          </div>
                          
                          {/* Actions on hover */}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4 bg-white/90 p-1 rounded-lg shadow-sm border border-slate-100">
                              <button onClick={() => { setEditingId(faculty.id); setEditFormTab('info'); }} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14}/></button>
                              <button onClick={() => handleDelete(faculty.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                          </div>
                      </div>
                      
                      <div className="space-y-2 mb-4 flex-1">
                          <div className="flex items-center gap-2 text-xs text-slate-600" title="Đơn vị/Vị trí">
                              <Building size={14} className="text-slate-400 flex-shrink-0"/>
                              <span className="truncate">{faculty.position[language] || t("Chưa cập nhật", "N/A")}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-600" title="Email liên hệ">
                              <Mail size={14} className="text-slate-400 flex-shrink-0"/>
                              <span className="truncate">{faculty.email || t("Chưa có email", "No email")}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-600" title="Điện thoại">
                              <Phone size={14} className="text-slate-400 flex-shrink-0"/>
                              <span className="truncate">{faculty.mobile || faculty.tel || t("Chưa có SĐT", "No phone")}</span>
                          </div>
                      </div>
                      
                      <div className="flex gap-2 mt-auto pt-3 border-t border-slate-100">
                          <div className="flex-1 text-center bg-slate-50 rounded-lg py-2 border border-slate-100">
                              <span className="block text-sm font-bold text-slate-800">{faculty.publicationsList?.length || 0}</span>
                              <span className="block text-[10px] text-slate-500 uppercase font-medium">{t("Công bố", "Papers")}</span>
                          </div>
                          <div className="flex-1 text-center bg-slate-50 rounded-lg py-2 border border-slate-100">
                              <span className="block text-sm font-bold text-slate-800">{new Date().getFullYear() - (faculty.careerStartYear || new Date().getFullYear())}</span>
                              <span className="block text-[10px] text-slate-500 uppercase font-medium">{t("Năm KN", "Yrs Exp")}</span>
                          </div>
                      </div>
                  </div>
              </div>
          )})}
          {filteredFaculties.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <User size={48} className="mx-auto mb-4 opacity-20"/>
                  <p>{t("Không tìm thấy nhân sự phù hợp.", "No personnel found.")}</p>
              </div>
          )}
      </div>
  );

  const renderListView = () => (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                      <th className="px-4 py-3">Họ và tên</th>
                      <th className="px-4 py-3">Mã/ID</th>
                      <th className="px-4 py-3">Học hàm/Học vị</th>
                      <th className="px-4 py-3">Đơn vị/Vị trí</th>
                      <th className="px-4 py-3">Liên hệ</th>
                      <th className="px-4 py-3 text-center">Thống kê</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                  {filteredFaculties.map(faculty => (
                      <tr key={faculty.id} className="hover:bg-slate-50 group transition-colors">
                          <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                                      {faculty.name[language]?.charAt(0)}
                                  </div>
                                  <div className="font-bold text-slate-800">{faculty.name[language]}</div>
                              </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">{faculty.id}</td>
                          <td className="px-4 py-3">
                              <div className="flex flex-col text-xs">
                                  <span className="font-medium text-indigo-700">{faculty.rank[language]}</span>
                                  <span className="text-slate-500">{faculty.degree[language]}</span>
                              </div>
                          </td>
                          <td className="px-4 py-3 text-slate-700 text-xs max-w-[200px] truncate" title={faculty.position[language]}>
                              {faculty.position[language] || '-'}
                          </td>
                          <td className="px-4 py-3">
                              <div className="flex flex-col text-xs">
                                  <span className="text-slate-700 flex items-center gap-1"><Mail size={10}/> {faculty.email}</span>
                                  <span className="text-slate-500 flex items-center gap-1"><Phone size={10}/> {faculty.mobile || faculty.tel}</span>
                              </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                              <div className="inline-flex gap-2">
                                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold border border-slate-200" title="Số bài báo">
                                      {faculty.publicationsList?.length || 0} Pubs
                                  </span>
                                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold border border-slate-200" title="Năm kinh nghiệm">
                                      {new Date().getFullYear() - (faculty.careerStartYear || new Date().getFullYear())} Yrs
                                  </span>
                              </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => { setEditingId(faculty.id); setEditFormTab('info'); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded bg-white border border-slate-200 shadow-sm" title="Sửa"><Edit2 size={14}/></button>
                                  <button onClick={() => handleDelete(faculty.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded bg-white border border-slate-200 shadow-sm" title="Xóa"><Trash2 size={14}/></button>
                              </div>
                          </td>
                      </tr>
                  ))}
                  {filteredFaculties.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic">Không tìm thấy dữ liệu.</td></tr>
                  )}
              </tbody>
          </table>
      </div>
  );

  const renderProfiles = () => {
      if (viewMode === 'list') return renderListView();
      return renderGridView();
  };

  const renderCategories = () => (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
              <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 text-sm">{t("Loại Danh mục", "Category Type")}</div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {[
                      { id: 'degrees', label: t('Học vị', 'Degrees') },
                      { id: 'ranks', label: t('Chức danh', 'Ranks') },
                      { id: 'academicTitles', label: t('Học hàm', 'Academic Titles') },
                      { id: 'positions', label: t('Chức vụ/Vị trí', 'Positions') }
                  ].map((cat) => (
                      <button
                          key={cat.id}
                          onClick={() => setCategoryType(cat.id as any)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${categoryType === cat.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                          {cat.label}
                      </button>
                  ))}
              </div>
          </div>

          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                   <h4 className="font-bold text-slate-800">{t("Danh sách Mục", "Items List")}</h4>
                   <button onClick={addCategoryItem} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-1"><Plus size={14}/> {t("Thêm mục", "Add Item")}</button>
              </div>
              <div className="flex-1 overflow-y-auto p-0">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-white text-slate-500 font-semibold border-b border-slate-200">
                          <tr>
                              <th className="px-4 py-3 w-10">#</th>
                              <th className="px-4 py-3">{t("Tên (VI)", "Name (VI)")}</th>
                              <th className="px-4 py-3">{t("Tên (EN)", "Name (EN)")}</th>
                              <th className="px-4 py-3 w-20 text-right">{t("Thao tác", "Actions")}</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {(facultyTitles[categoryType] || []).map((item, idx) => (
                              <tr key={item.id} className="hover:bg-slate-50 group">
                                  <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                                  <td className="px-4 py-3">
                                      <input 
                                          className="w-full bg-transparent border-b border-transparent focus:border-indigo-500 outline-none"
                                          value={item.name.vi}
                                          onChange={(e) => updateCategoryItem(item.id, 'name', 'vi', e.target.value)}
                                          placeholder="..."
                                      />
                                  </td>
                                  <td className="px-4 py-3">
                                      <input 
                                          className="w-full bg-transparent border-b border-transparent focus:border-indigo-500 outline-none"
                                          value={item.name.en}
                                          onChange={(e) => updateCategoryItem(item.id, 'name', 'en', e.target.value)}
                                          placeholder="..."
                                      />
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                      <button onClick={() => deleteCategoryItem(item.id)} className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                  </td>
                              </tr>
                          ))}
                          {(facultyTitles[categoryType] || []).length === 0 && (
                              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">{t("Chưa có dữ liệu.", "No data.")}</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
  );

  return (
    <div className="h-full flex flex-col p-6">
      <AILoader isVisible={isAiLoading} message={language === 'vi' ? 'Đang xử lý...' : 'Processing...'} />
      {renderEditForm()}
      <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">{t("Quản lý Hồ sơ Nhân sự", "Personnel Profile Management")}</h2>
          <div className="flex bg-slate-200 p-1 rounded-lg">
             <button onClick={() => setLanguage('vi')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'vi' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>VI</button>
             <button onClick={() => setLanguage('en')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'en' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>EN</button>
          </div>
      </div>
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm mb-6 flex gap-2 w-fit">
          <button onClick={() => setMainTab('profiles')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ${mainTab === 'profiles' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'}`}><User size={16}/> {t("Hồ sơ", "Profiles")}</button>
          <button onClick={() => setMainTab('stats')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ${mainTab === 'stats' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'}`}><BarChart3 size={16}/> {t("Thống kê", "Stats")}</button>
          {/* Hide Categories Tab if Unit Manager */}
          {(!permission || permission.role === 'school_admin') && (
              <button onClick={() => setMainTab('categories')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ${mainTab === 'categories' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'}`}><Settings size={16}/> {t("Danh mục", "Categories")}</button>
          )}
      </div>
      
      {/* Shared Filter Toolbar for Profiles and Stats */}
      {(mainTab === 'profiles' || mainTab === 'stats') && renderFilters()}

      <div className="flex-1 overflow-y-auto custom-scrollbar">
          {mainTab === 'profiles' && renderProfiles()}
          {mainTab === 'stats' && <FacultyStatisticsModule faculties={filteredFaculties} courses={courses} language={language} />}
          {mainTab === 'categories' && (!permission || permission.role === 'school_admin') && renderCategories()}
      </div>

      {/* AI Import Modal */}
      {isAiImportModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-purple-50 rounded-t-xl">
                      <h3 className="font-bold text-purple-900 flex items-center gap-2">
                          <Bot size={20} className="text-purple-600"/> 
                          AI Hỗ trợ tạo Hồ sơ Nhân sự
                      </h3>
                      <button onClick={() => setIsAiImportModalOpen(false)} className="text-purple-300 hover:text-purple-600">
                          <X size={20}/>
                      </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto flex-1 space-y-6">
                      {/* Step 1: Copy Prompt */}
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <div className="flex justify-between items-center mb-2">
                              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">1</span> 
                                  Sao chép Prompt mẫu
                              </h4>
                              <button 
                                  onClick={handleCopyAiPrompt}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-purple-200 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-50 shadow-sm transition-all"
                              >
                                  <Copy size={14}/> Sao chép
                              </button>
                          </div>
                          <p className="text-xs text-slate-500">
                              Copy prompt này và gửi cho AI (ChatGPT, Gemini) để tạo dữ liệu JSON hồ sơ nhân sự chuẩn xác (song ngữ, đầy đủ thông tin).
                          </p>
                      </div>

                      {/* Step 2: Paste JSON */}
                      <div>
                          <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">2</span> 
                              Dán kết quả JSON vào đây
                          </h4>
                          <textarea 
                              className="w-full h-32 p-3 bg-slate-900 text-green-400 font-mono text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                              placeholder='[ { "name": { "vi": "Nguyễn Văn A", ... }, ... }, ... ]'
                              value={aiJsonInput}
                              onChange={(e) => setAiJsonInput(e.target.value)}
                          />
                          {aiImportError && (
                              <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
                                  {aiImportError}
                              </div>
                          )}
                      </div>

                      {/* Step 3: Conflict Resolution & Preview */}
                      {aiParsedData && (
                          <div className="border-t border-slate-200 pt-4">
                              <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">3</span> 
                                  Kiểm tra & Chuẩn hóa Dữ liệu
                              </h4>

                              {/* Conflicts Area */}
                              {detectedConflicts.length > 0 && (
                                  <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                                      <div className="flex items-center gap-2 mb-3 text-amber-800">
                                          <AlertTriangle size={16}/>
                                          <span className="font-bold text-sm">Phát hiện {detectedConflicts.length} giá trị chưa khớp với hệ thống</span>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {detectedConflicts.map((conflict, idx) => (
                                              <div key={idx} className="bg-white p-3 rounded border border-amber-100 shadow-sm flex flex-col gap-2">
                                                  <div className="flex justify-between text-xs">
                                                      <span className="text-slate-500 font-bold uppercase">{conflict.label}</span>
                                                      <span className="text-red-500 font-mono bg-red-50 px-1 rounded">"{conflict.value}"</span>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                      <ArrowRightLeft size={14} className="text-slate-400"/>
                                                      <select 
                                                          className="flex-1 text-xs border border-slate-300 rounded p-1.5 focus:border-indigo-500 outline-none"
                                                          value={importMappings[`${conflict.field}:${conflict.value}`] || ''}
                                                          onChange={(e) => handleMappingChange(conflict.field as string, conflict.value, e.target.value)}
                                                      >
                                                          <option value="">-- Chọn hành động --</option>
                                                          <option value="__SKIP__">Bỏ qua (Để trống)</option>
                                                          <optgroup label="Ghép vào danh mục có sẵn">
                                                              {(facultyTitles[conflict.field] || []).map(opt => (
                                                                  <option key={opt.id} value={opt.name.vi}>{opt.name.vi} / {opt.name.en}</option>
                                                              ))}
                                                          </optgroup>
                                                      </select>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}

                              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                                  <table className="w-full text-xs text-left">
                                      <thead className="bg-slate-100 sticky top-0">
                                          <tr>
                                              <th className="px-2 py-1">#</th>
                                              <th className="px-2 py-1">Tên (VI)</th>
                                              <th className="px-2 py-1">Học vị (Degree)</th>
                                              <th className="px-2 py-1">Chức danh (Rank)</th>
                                              <th className="px-2 py-1">Email</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {aiParsedData.map((row, idx) => (
                                              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                                  <td className="px-2 py-1 text-slate-400">{idx + 1}</td>
                                                  <td className="px-2 py-1 font-bold">{row.name.vi}</td>
                                                  <td className="px-2 py-1">
                                                      {row.degree.vi || row.degree.en}
                                                      {importMappings[`degrees:${row.degree.vi || row.degree.en}`] && (
                                                          <span className="ml-1 text-[9px] bg-green-100 text-green-700 px-1 rounded">
                                                              → {importMappings[`degrees:${row.degree.vi || row.degree.en}`] === '__SKIP__' ? '(Xóa)' : importMappings[`degrees:${row.degree.vi || row.degree.en}`]}
                                                          </span>
                                                      )}
                                                  </td>
                                                  <td className="px-2 py-1">
                                                      {row.rank.vi || row.rank.en}
                                                      {importMappings[`ranks:${row.rank.vi || row.rank.en}`] && (
                                                          <span className="ml-1 text-[9px] bg-green-100 text-green-700 px-1 rounded">
                                                              → {importMappings[`ranks:${row.rank.vi || row.rank.en}`] === '__SKIP__' ? '(Xóa)' : importMappings[`ranks:${row.rank.vi || row.rank.en}`]}
                                                          </span>
                                                      )}
                                                  </td>
                                                  <td className="px-2 py-1 text-slate-500 italic">{row.email}</td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 rounded-b-xl">
                      {!aiParsedData ? (
                          <button 
                              onClick={handleParseAiJson} 
                              disabled={!aiJsonInput}
                              className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                          >
                              Phân tích & Xem trước <ArrowRight size={16}/>
                          </button>
                      ) : (
                          <>
                              <button onClick={() => { setAiParsedData(null); setDetectedConflicts([]); }} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-bold">Hủy bỏ</button>
                              <button onClick={handleConfirmAiImport} className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-bold flex items-center gap-2">
                                  <Check size={16}/> Xác nhận Nhập
                              </button>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default FacultyModule;