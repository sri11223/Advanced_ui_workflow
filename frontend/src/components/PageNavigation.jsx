import React from 'react';

const PageNavigation = ({ wireframeData, currentPageId, onPageChange }) => {
  if (!wireframeData || !wireframeData.pages || wireframeData.pages.length <= 1) {
    return null;
  }

  return (
    <div className="absolute top-4 right-4 z-10">
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-2 flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700">Pages:</span>
        {wireframeData.pages.map((page) => (
          <button
            key={page.id}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              currentPageId === page.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {page.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PageNavigation;
