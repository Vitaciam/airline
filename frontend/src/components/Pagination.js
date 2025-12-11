import React from 'react';

function Pagination({ currentPage, totalPages, onPageChange, itemsPerPage, totalItems }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between mt-8">
      <div className="text-gray-600 font-semibold">
        Показано {startItem}-{endItem} из {totalItems}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-black font-bold rounded-full transition-colors"
        >
          ←
        </button>
        {startPage > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-black font-bold rounded-full transition-colors"
            >
              1
            </button>
            {startPage > 2 && <span className="px-2 text-gray-400">...</span>}
          </>
        )}
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-4 py-2 font-bold rounded-full transition-colors ${
              currentPage === page
                ? 'bg-black text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-black'
            }`}
          >
            {page}
          </button>
        ))}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-2 text-gray-400">...</span>}
            <button
              onClick={() => onPageChange(totalPages)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-black font-bold rounded-full transition-colors"
            >
              {totalPages}
            </button>
          </>
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-black font-bold rounded-full transition-colors"
        >
          →
        </button>
      </div>
    </div>
  );
}

export default Pagination;

