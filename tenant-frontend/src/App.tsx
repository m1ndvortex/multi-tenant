import React from 'react';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/30 to-white" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-800 mb-4">
              HesaabPlus
            </h1>
            <p className="text-xl text-slate-600">
              سیستم مدیریت کسب و کار
            </p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                سیستم آماده است
              </h2>
              <p className="text-slate-600">
                اپلیکیشن مدیریت کسب و کار با موفقیت راه‌اندازی شد
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gradient-to-br from-green-50 to-teal-100/50 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">Backend API</h3>
                <p className="text-green-700">http://localhost:8000</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100/50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">Super Admin</h3>
                <p className="text-blue-700">http://localhost:3000</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-violet-100/50 rounded-lg p-4">
                <h3 className="font-semibold text-purple-800 mb-2">Tenant App</h3>
                <p className="text-purple-700">http://localhost:3001</p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gradient-to-r from-slate-50 to-slate-100/80 rounded-lg">
              <h3 className="font-semibold text-slate-800 mb-2">ویژگی‌های کلیدی</h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>• مدیریت فاکتور دوگانه</div>
                <div>• سیستم اقساط طلا</div>
                <div>• حسابداری جامع</div>
                <div>• گزارش‌گیری پیشرفته</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;