import { useState, useEffect } from 'react';
import { supabase } from './supabase';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  class_name: string;
  registered_at: string;
}

interface Attachment {
  name: string;
  url: string;
  type: string;
}

interface Homework {
  id: string;
  subject: string;
  title: string;
  details: string;
  due_date: string;
  attachments: Attachment[];
  created_at: string;
  updated_at?: string;
}

interface View {
  id: string;
  homework_id: string;
  student_id: string;
  viewed_at: string;
  students?: Student;
}

interface Download {
  id: string;
  homework_id: string;
  student_id: string;
  file_name: string;
  downloaded_at: string;
  students?: Student;
}

type UserType = 'none' | 'teacher' | 'student';
type TeacherTab = 'homeworks' | 'students' | 'settings';

const SUBJECTS = [
  'الرياضيات',
  'اللغة العربية',
  'اللغة الفرنسية',
  'اللغة الإنجليزية',
  'العلوم الطبيعية',
  'الفيزياء',
  'التاريخ والجغرافيا',
  'التربية الإسلامية',
  'التربية المدنية',
  'التربية الفنية',
  'التربية البدنية',
  'الإعلام الآلي',
  'مادة أخرى'
];

const CLASSES = [
  'السنة الأولى ابتدائي',
  'السنة الثانية ابتدائي',
  'السنة الثالثة ابتدائي',
  'السنة الرابعة ابتدائي',
  'السنة الخامسة ابتدائي',
  'السنة الأولى متوسط',
  'السنة الثانية متوسط',
  'السنة الثالثة متوسط',
  'السنة الرابعة متوسط',
  'السنة الأولى ثانوي',
  'السنة الثانية ثانوي',
  'السنة الثالثة ثانوي'
];

export default function App() {
  const [userType, setUserType] = useState<UserType>('none');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TeacherTab>('homeworks');
  
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [views, setViews] = useState<View[]>([]);
  const [downloads, setDownloads] = useState<Download[]>([]);
  
  const [settings, setSettings] = useState({ teacher_password: '1234', student_code: '0000' });
  
  const [showHomeworkForm, setShowHomeworkForm] = useState(false);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);
  const [newHomework, setNewHomework] = useState({
    subject: '',
    title: '',
    details: '',
    due_date: '',
    attachments: [] as Attachment[]
  });
  
  const [studentForm, setStudentForm] = useState({
    first_name: '',
    last_name: '',
    class_name: '',
    code: ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [newStudentCode, setNewStudentCode] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);
  const [showViewsModal, setShowViewsModal] = useState(false);
  const [showDownloadsModal, setShowDownloadsModal] = useState(false);
  const [modalHomeworkId, setModalHomeworkId] = useState<string>('');

  // Load data from Supabase
  useEffect(() => {
    loadSettings();
    loadHomeworks();
    loadStudents();
    loadViews();
    loadDownloads();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase.from('settings').select('*').single();
    if (data) {
      setSettings(data);
      setNewStudentCode(data.student_code);
    }
  };

  const loadHomeworks = async () => {
    const { data } = await supabase.from('homeworks').select('*').order('created_at', { ascending: false });
    if (data) setHomeworks(data);
  };

  const loadStudents = async () => {
    const { data } = await supabase.from('students').select('*').order('registered_at', { ascending: false });
    if (data) setStudents(data);
  };

  const loadViews = async () => {
    const { data } = await supabase.from('views').select('*, students(*)');
    if (data) setViews(data);
  };

  const loadDownloads = async () => {
    const { data } = await supabase.from('downloads').select('*, students(*)');
    if (data) setDownloads(data);
  };

  const handleTeacherLogin = async () => {
    if (teacherPassword === settings.teacher_password) {
      setIsLoggedIn(true);
      setError('');
    } else {
      setError('كلمة السر غير صحيحة');
    }
  };

  const handleStudentRegister = async () => {
    if (!studentForm.first_name || !studentForm.last_name || !studentForm.class_name) {
      setError('يرجى ملء جميع الحقول');
      return;
    }
    if (studentForm.code !== settings.student_code) {
      setError('الكود السري غير صحيح');
      return;
    }
    
    const { data, error: insertError } = await supabase.from('students').insert({
      first_name: studentForm.first_name,
      last_name: studentForm.last_name,
      class_name: studentForm.class_name
    }).select().single();
    
    if (insertError) {
      setError('حدث خطأ في التسجيل');
      return;
    }
    
    setCurrentStudent(data);
    setIsLoggedIn(true);
    setError('');
    loadStudents();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newAttachments: Attachment[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = `${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(fileName, file);
      
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('attachments')
          .getPublicUrl(fileName);
        
        newAttachments.push({
          name: file.name,
          url: urlData.publicUrl,
          type: file.type.includes('pdf') ? 'pdf' : 'image'
        });
      }
    }
    
    setNewHomework(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...newAttachments]
    }));
  };

  const handleAddHomework = async () => {
    if (!newHomework.subject || !newHomework.title || !newHomework.due_date) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    
    if (editingHomework) {
      await supabase.from('homeworks').update({
        subject: newHomework.subject,
        title: newHomework.title,
        details: newHomework.details,
        due_date: newHomework.due_date,
        attachments: newHomework.attachments,
        updated_at: new Date().toISOString()
      }).eq('id', editingHomework.id);
    } else {
      await supabase.from('homeworks').insert({
        subject: newHomework.subject,
        title: newHomework.title,
        details: newHomework.details,
        due_date: newHomework.due_date,
        attachments: newHomework.attachments
      });
    }
    
    setNewHomework({ subject: '', title: '', details: '', due_date: '', attachments: [] });
    setShowHomeworkForm(false);
    setEditingHomework(null);
    setError('');
    loadHomeworks();
  };

  const handleDeleteHomework = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الواجب؟')) {
      await supabase.from('homeworks').delete().eq('id', id);
      loadHomeworks();
    }
  };

  const handleEditHomework = (homework: Homework) => {
    setEditingHomework(homework);
    setNewHomework({
      subject: homework.subject,
      title: homework.title,
      details: homework.details,
      due_date: homework.due_date,
      attachments: homework.attachments || []
    });
    setShowHomeworkForm(true);
  };

  const handleViewHomework = async (homework: Homework) => {
    setSelectedHomework(homework);
    
    if (currentStudent) {
      const existingView = views.find(
        v => v.homework_id === homework.id && v.student_id === currentStudent.id
      );
      
      if (!existingView) {
        await supabase.from('views').insert({
          homework_id: homework.id,
          student_id: currentStudent.id
        });
        loadViews();
      }
    }
  };

  const handleDownload = async (homework: Homework, attachment: Attachment) => {
    if (currentStudent) {
      await supabase.from('downloads').insert({
        homework_id: homework.id,
        student_id: currentStudent.id,
        file_name: attachment.name
      });
      loadDownloads();
    }
    window.open(attachment.url, '_blank');
  };

  const handleChangePassword = async () => {
    if (passwordForm.current !== settings.teacher_password) {
      setPasswordMessage('كلمة السر الحالية غير صحيحة');
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordMessage('كلمة السر الجديدة غير متطابقة');
      return;
    }
    if (passwordForm.new.length < 4) {
      setPasswordMessage('كلمة السر يجب أن تكون 4 أحرف على الأقل');
      return;
    }
    
    await supabase.from('settings').update({ teacher_password: passwordForm.new }).eq('id', settings.id);
    setSettings(prev => ({ ...prev, teacher_password: passwordForm.new }));
    setPasswordForm({ current: '', new: '', confirm: '' });
    setPasswordMessage('تم تغيير كلمة السر بنجاح ✓');
  };

  const handleChangeStudentCode = async () => {
    if (newStudentCode.length < 4) {
      setPasswordMessage('الكود يجب أن يكون 4 أرقام على الأقل');
      return;
    }
    
    await supabase.from('settings').update({ student_code: newStudentCode }).eq('id', settings.id);
    setSettings(prev => ({ ...prev, student_code: newStudentCode }));
    setPasswordMessage('تم تغيير كود التلاميذ بنجاح ✓');
  };

  const handleDeleteStudent = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا التلميذ؟')) {
      await supabase.from('students').delete().eq('id', id);
      loadStudents();
    }
  };

  const getHomeworkViews = (homeworkId: string) => views.filter(v => v.homework_id === homeworkId);
  const getHomeworkDownloads = (homeworkId: string) => downloads.filter(d => d.homework_id === homeworkId);
  const getStudentViews = (studentId: string) => views.filter(v => v.student_id === studentId);
  const getStudentDownloads = (studentId: string) => downloads.filter(d => d.student_id === studentId);

  const formatDate = (date: string) => new Date(date).toLocaleDateString('ar-DZ');
  const formatDateTime = (date: string) => new Date(date).toLocaleString('ar-DZ');

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  // Selection Screen
  if (userType === 'none') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">منصة الواجبات المدرسية</h1>
          <p className="text-gray-600 mb-8">اختر نوع الحساب للدخول</p>
          
          <div className="space-y-4">
            <button
              onClick={() => setUserType('teacher')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 flex items-center justify-center gap-3"
            >
              <span className="text-2xl">👨‍🏫</span>
              <span>أنا الأستاذ</span>
            </button>
            
            <button
              onClick={() => setUserType('student')}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 flex items-center justify-center gap-3"
            >
              <span className="text-2xl">👨‍🎓</span>
              <span>أنا تلميذ</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Teacher Login
  if (userType === 'teacher' && !isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <button
            onClick={() => setUserType('none')}
            className="text-gray-500 hover:text-gray-700 mb-4"
          >
            → رجوع
          </button>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">دخول الأستاذ 👨‍🏫</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">كلمة السر</label>
              <input
                type="password"
                value={teacherPassword}
                onChange={(e) => setTeacherPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleTeacherLogin()}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                placeholder="أدخل كلمة السر"
              />
            </div>
            
            {error && <p className="text-red-500 text-center">{error}</p>}
            
            <button
              onClick={handleTeacherLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
            >
              دخول
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Student Registration
  if (userType === 'student' && !isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <button
            onClick={() => setUserType('none')}
            className="text-gray-500 hover:text-gray-700 mb-4"
          >
            → رجوع
          </button>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">تسجيل التلميذ 👨‍🎓</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">اللقب</label>
              <input
                type="text"
                value={studentForm.last_name}
                onChange={(e) => setStudentForm(prev => ({ ...prev, last_name: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                placeholder="أدخل اللقب"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2">الاسم</label>
              <input
                type="text"
                value={studentForm.first_name}
                onChange={(e) => setStudentForm(prev => ({ ...prev, first_name: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                placeholder="أدخل الاسم"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2">القسم</label>
              <select
                value={studentForm.class_name}
                onChange={(e) => setStudentForm(prev => ({ ...prev, class_name: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
              >
                <option value="">اختر القسم</option>
                {CLASSES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2">🔐 الكود السري</label>
              <input
                type="password"
                value={studentForm.code}
                onChange={(e) => setStudentForm(prev => ({ ...prev, code: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                placeholder="أدخل الكود السري (من الأستاذ)"
              />
            </div>
            
            {error && <p className="text-red-500 text-center">{error}</p>}
            
            <button
              onClick={handleStudentRegister}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
            >
              تسجيل الدخول
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Teacher Dashboard
  if (userType === 'teacher' && isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-blue-600 text-white p-4 shadow-lg">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold">لوحة تحكم الأستاذ 👨‍🏫</h1>
            <button
              onClick={() => { setIsLoggedIn(false); setUserType('none'); setTeacherPassword(''); }}
              className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition-all"
            >
              خروج
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className="container mx-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow text-center">
              <div className="text-3xl font-bold text-blue-600">{homeworks.length}</div>
              <div className="text-gray-600">الواجبات</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow text-center">
              <div className="text-3xl font-bold text-green-600">{students.length}</div>
              <div className="text-gray-600">التلاميذ</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow text-center">
              <div className="text-3xl font-bold text-purple-600">{views.length}</div>
              <div className="text-gray-600">المشاهدات</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow text-center">
              <div className="text-3xl font-bold text-orange-600">{downloads.length}</div>
              <div className="text-gray-600">التحميلات</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('homeworks')}
              className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                activeTab === 'homeworks' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              📚 الواجبات
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                activeTab === 'students' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              👨‍🎓 التلاميذ ({students.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                activeTab === 'settings' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              ⚙️ الإعدادات
            </button>
          </div>

          {/* Homeworks Tab */}
          {activeTab === 'homeworks' && (
            <div>
              <button
                onClick={() => { setShowHomeworkForm(true); setEditingHomework(null); setNewHomework({ subject: '', title: '', details: '', due_date: '', attachments: [] }); }}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl mb-6 transition-all"
              >
                + إضافة واجب جديد
              </button>

              {showHomeworkForm && (
                <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
                  <h3 className="text-xl font-bold mb-4">{editingHomework ? 'تعديل الواجب' : 'إضافة واجب جديد'}</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-700 mb-2">المادة *</label>
                      <select
                        value={newHomework.subject}
                        onChange={(e) => setNewHomework(prev => ({ ...prev, subject: e.target.value }))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">اختر المادة</option>
                        {SUBJECTS.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 mb-2">تاريخ التسليم *</label>
                      <input
                        type="date"
                        value={newHomework.due_date}
                        onChange={(e) => setNewHomework(prev => ({ ...prev, due_date: e.target.value }))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2">العنوان *</label>
                    <input
                      type="text"
                      value={newHomework.title}
                      onChange={(e) => setNewHomework(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="عنوان الواجب"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2">التفاصيل</label>
                    <textarea
                      value={newHomework.details}
                      onChange={(e) => setNewHomework(prev => ({ ...prev, details: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none h-32"
                      placeholder="تفاصيل وتعليمات الواجب..."
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2">📎 المرفقات (صور أو PDF)</label>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                    
                    {newHomework.attachments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {newHomework.attachments.map((att, idx) => (
                          <div key={idx} className="bg-gray-100 px-3 py-2 rounded-lg flex items-center gap-2">
                            <span>{att.type === 'pdf' ? '📄' : '🖼️'}</span>
                            <span className="text-sm">{att.name}</span>
                            <button
                              onClick={() => setNewHomework(prev => ({
                                ...prev,
                                attachments: prev.attachments.filter((_, i) => i !== idx)
                              }))}
                              className="text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {error && <p className="text-red-500 mb-4">{error}</p>}
                  
                  <div className="flex gap-3">
                    <button
                      onClick={handleAddHomework}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
                    >
                      {editingHomework ? 'حفظ التعديلات' : 'إضافة
