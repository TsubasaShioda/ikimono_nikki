'use client';

import { useState, useEffect } from 'react';
import { Category } from '@prisma/client';

interface FilterSidebarProps {
  onApplyFilters: (filters: any) => void;
  initialFilters: any;
  isSidebarOpen: boolean;
  onClose: () => void;
}

const FilterSidebar = ({ onApplyFilters, initialFilters, isSidebarOpen, onClose }: FilterSidebarProps) => {
  const [keyword, setKeyword] = useState(initialFilters.q || '');
  const [categoryId, setCategoryId] = useState(initialFilters.categoryId || '');
  const [startDate, setStartDate] = useState(initialFilters.startDate || '');
  const [endDate, setEndDate] = useState(initialFilters.endDate || '');
  const [timeOfDay, setTimeOfDay] = useState(initialFilters.timeOfDay || 'all');
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    // Sync state with props when sidebar opens
    if (isSidebarOpen) {
      setKeyword(initialFilters.q || '');
      setCategoryId(initialFilters.categoryId || '');
      setStartDate(initialFilters.startDate || '');
      setEndDate(initialFilters.endDate || '');
      setTimeOfDay(initialFilters.timeOfDay || 'all');
    }
  }, [isSidebarOpen, initialFilters]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories);
        }
      } catch (error) {
        console.error('Failed to fetch categories', error);
      }
    };
    fetchCategories();
  }, []);

  const handleApply = () => {
    onApplyFilters({
      q: keyword,
      categoryId: categoryId,
      startDate,
      endDate,
      timeOfDay: timeOfDay,
    });
    onClose();
  };

  const handleReset = () => {
    setKeyword('');
    setCategoryId('');
    setStartDate('');
    setEndDate('');
    setTimeOfDay('all');
    onApplyFilters({
      q: '',
      categoryId: '',
      startDate: '',
      endDate: '',
      timeOfDay: 'all',
    });
    onClose();
  };

  return (
    <div className={`fixed top-0 right-0 h-full bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out text-gray-900 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`} style={{width: '320px'}}>
      <div className="p-5">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">フィルター</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>
        <div className="space-y-5">
          {/* Keyword Search */}
          <div>
            <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-1">キーワード</label>
            <input
              type="text"
              id="keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="タイトル、説明..."
            />
          </div>

          {/* Category Filter */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">すべてのカテゴリ</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">発見日</label>
            <div className="flex items-center space-x-2 mt-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <span className="text-gray-500">〜</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Time of Day Filter */}
          <div>
            <label htmlFor="timeOfDay" className="block text-sm font-medium text-gray-700 mb-1">時間帯</label>
            <select
              id="timeOfDay"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="all">すべての時間帯</option>
              <option value="morning">朝 (5:00-9:59)</option>
              <option value="daytime">昼 (10:00-15:59)</option>
              <option value="night">夜 (16:00-4:59)</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            リセット
          </button>
          <button
            onClick={handleApply}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            適用
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterSidebar;
