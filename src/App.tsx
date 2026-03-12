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
                      {editingHomework ? 'حفظ التعديلات' : 'إضافة الواجب'}
                    </button>
                    <button
                      onClick={() => { setShowHomeworkForm(false); setEditingHomework(null); setError(''); }}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-3 px-6 rounded-xl transition-all"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {/* Homeworks List */}
              <div className="space-y-4">
                {homeworks.map(hw => (
                  <div key={hw.id} className="bg-white rounded-xl p-6 shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                          {hw.subject}
                        </span>
                        {hw.updated_at && (
                          <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm mr-2">
                            معدّل
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditHomework(hw)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteHomework(hw.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{hw.title}</h3>
                    <p className="text-gray-600 mb-3">{hw.details}</p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                      <span>📅 التسليم: {formatDate(hw.due_date)}</span>
                      {hw.attachments?.length > 0 && (
                        <span>📎 {hw.attachments.length} مرفق</span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => { setModalHomeworkId(hw.id); setShowViewsModal(true); }}
                        className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-all"
                      >
                        👁️ من شاهد ({getHomeworkViews(hw.id).length})
                      </button>
                      <button
                        onClick={() => { setModalHomeworkId(hw.id); setShowDownloadsModal(true); }}
                        className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg hover:bg-orange-200 transition-all"
                      >
                        📥 من حمّل ({getHomeworkDownloads(hw.id).length})
                      </button>
                    </div>
                  </div>
                ))}
                
                {homeworks.length === 0 && (
                  <div className="bg-white rounded-xl p-8 text-center text-gray-500">
                    لا توجد واجبات بعد. أضف واجبك الأول!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Students Tab */}
          {activeTab === 'students' && (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-right text-gray-700 font-bold">الاسم الكامل</th>
                    <th className="px-6 py-4 text-right text-gray-700 font-bold">القسم</th>
                    <th className="px-6 py-4 text-right text-gray-700 font-bold">تاريخ التسجيل</th>
                    <th className="px-6 py-4 text-right text-gray-700 font-bold">المشاهدات</th>
                    <th className="px-6 py-4 text-right text-gray-700 font-bold">التحميلات</th>
                    <th className="px-6 py-4 text-right text-gray-700 font-bold">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student.id} className="border-t hover:bg-gray-50">
                      <td className="px-6 py-4">{student.last_name} {student.first_name}</td>
                      <td className="px-6 py-4">{student.class_name}</td>
                      <td className="px-6 py-4">{formatDateTime(student.registered_at)}</td>
                      <td className="px-6 py-4">
                        <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                          {getStudentViews(student.id).length}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full">
                          {getStudentDownloads(student.id).length}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          🗑️ حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {students.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  لا يوجد تلاميذ مسجلون بعد
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Change Password */}
              <div className="bg-white rounded-xl p-6 shadow">
                <h3 className="text-xl font-bold text-gray-800 mb-4">🔐 تغيير كلمة سر الأستاذ</h3>
                
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-gray-700 mb-2">كلمة السر الحالية</label>
                    <input
                      type="password"
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">كلمة السر الجديدة</label>
                    <input
                      type="password"
                      value={passwordForm.new}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">تأكيد كلمة السر الجديدة</label>
                    <input
                      type="password"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleChangePassword}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
                  >
                    تغيير كلمة السر
                  </button>
                </div>
              </div>

              {/* Change Student Code */}
              <div className="bg-white rounded-xl p-6 shadow">
                <h3 className="text-xl font-bold text-gray-800 mb-4">🔑 كود دخول التلاميذ</h3>
                <p className="text-gray-600 mb-4">شارك هذا الكود مع تلاميذك فقط</p>
                
                <div className="flex gap-4 items-center max-w-md">
                  <input
                    type="text"
                    value={newStudentCode}
                    onChange={(e) => setNewStudentCode(e.target.value)}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-2xl text-center font-bold tracking-widest"
                    maxLength={6}
                  />
                  <button
                    onClick={handleChangeStudentCode}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
                  >
                    حفظ
                  </button>
                </div>
                
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-yellow-800">
                    <strong>الكود الحالي:</strong> <span className="font-mono text-2xl">{settings.student_code}</span>
                  </p>
                </div>
              </div>

              {passwordMessage && (
                <div className={`p-4 rounded-xl ${passwordMessage.includes('✓') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {passwordMessage}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Views Modal */}
        {showViewsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-96 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">👁️ من شاهد هذا الواجب</h3>
                <button onClick={() => setShowViewsModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
              </div>
              
              {getHomeworkViews(modalHomeworkId).length > 0 ? (
                <div className="space-y-3">
                  {getHomeworkViews(modalHomeworkId).map(view => (
                    <div key={view.id} className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                      <div>
                        <div className="font-bold">{view.students?.last_name} {view.students?.first_name}</div>
                        <div className="text-sm text-gray-500">{view.students?.class_name}</div>
                      </div>
                      <div className="text-sm text-gray-500">{formatDateTime(view.viewed_at)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">لا أحد شاهد هذا الواجب بعد</p>
              )}
            </div>
          </div>
        )}

        {/* Downloads Modal */}
        {showDownloadsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-96 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">📥 من حمّل من هذا الواجب</h3>
                <button onClick={() => setShowDownloadsModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
              </div>
              
              {getHomeworkDownloads(modalHomeworkId).length > 0 ? (
                <div className="space-y-3">
                  {getHomeworkDownloads(modalHomeworkId).map(dl => (
                    <div key={dl.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold">{dl.students?.last_name} {dl.students?.first_name}</div>
                          <div className="text-sm text-gray-500">{dl.students?.class_name}</div>
                        </div>
                        <div className="text-sm text-gray-500">{formatDateTime(dl.downloaded_at)}</div>
                      </div>
                      <div className="text-sm text-blue-600 mt-2">📄 {dl.file_name}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">لا أحد حمّل من هذا الواجب بعد</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Student Dashboard
  if (userType === 'student' && isLoggedIn && currentStudent) {
    return (
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-green-600 text-white p-4 shadow-lg">
          <div className="container mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">مرحباً {currentStudent.first_name} 👋</h1>
              <p className="text-green-200">{currentStudent.class_name}</p>
            </div>
            <button
              onClick={() => { setIsLoggedIn(false); setUserType('none'); setCurrentStudent(null); }}
              className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition-all"
            >
              خروج
            </button>
          </div>
        </header>

        <div className="container mx-auto p-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📚 الواجبات المنزلية</h2>
          
          {selectedHomework ? (
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <button
                onClick={() => setSelectedHomework(null)}
                className="text-blue-600 hover:text-blue-800 mb-4"
              >
                → العودة للواجبات
              </button>
              
              <div className="mb-4">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                  {selectedHomework.subject}
                </span>
                {isOverdue(selectedHomework.due_date) && (
                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm mr-2">
                    متأخر
                  </span>
                )}
              </div>
              
              <h3 className="text-2xl font-bold text-gray-800 mb-4">{selectedHomework.title}</h3>
              <p className="text-gray-600 mb-4 whitespace-pre-wrap">{selectedHomework.details}</p>
              
              <div className="text-gray-500 mb-6">
                📅 تاريخ التسليم: {formatDate(selectedHomework.due_date)}
              </div>
              
              {selectedHomework.attachments?.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-800 mb-3">📎 المرفقات:</h4>
                  <div className="grid gap-4">
                    {selectedHomework.attachments.map((att, idx) => (
                      <div key={idx} className="border rounded-xl p-4">
                        {att.type === 'image' && (
                          <img src={att.url} alt={att.name} className="max-w-full h-auto rounded-lg mb-3" />
                        )}
                        <div className="flex justify-between items-center">
                          <span>{att.type === 'pdf' ? '📄' : '🖼️'} {att.name}</span>
                          <button
                            onClick={() => handleDownload(selectedHomework, att)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all"
                          >
                            📥 تحميل
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {homeworks.map(hw => (
                <div
                  key={hw.id}
                  onClick={() => handleViewHomework(hw)}
                  className="bg-white rounded-xl p-6 shadow hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-2">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                        {hw.subject}
                      </span>
                      {!views.find(v => v.homework_id === hw.id && v.student_id === currentStudent.id) && (
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                          جديد
                        </span>
                      )}
                      {isOverdue(hw.due_date) && (
                        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                          متأخر
                        </span>
                      )}
                    </div>
                    {hw.attachments?.length > 0 && (
                      <span className="text-gray-500">📎 {hw.attachments.length}</span>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{hw.title}</h3>
                  <p className="text-gray-600 mb-3 line-clamp-2">{hw.details}</p>
                  
                  <div className="text-sm text-gray-500">
                    📅 التسليم: {formatDate(hw.due_date)}
                  </div>
                </div>
              ))}
              
              {homeworks.length === 0 && (
                <div className="bg-white rounded-xl p-8 text-center text-gray-500">
                  🎉 لا توجد واجبات حالياً
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
