import React, { useState, useRef, useCallback } from 'react';

interface Column {
  key: string;
  header: string;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  render?: (value: any, row: any) => React.ReactNode;
}

interface ResizableTableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  rowClassName?: string;
  className?: string;
}

const ResizableTable: React.FC<ResizableTableProps> = ({
  columns: initialColumns,
  data,
  onRowClick,
  rowClassName = "",
  className = ""
}) => {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [resizing, setResizing] = useState<{ index: number; startX: number; startWidth: number } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = columns[index].width;
    
    setResizing({ index, startX, startWidth });
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(
        columns[index].minWidth || 100,
        Math.min(
          columns[index].maxWidth || 500,
          startWidth + deltaX
        )
      );
      
      setColumns(prev => prev.map((col, i) => 
        i === index ? { ...col, width: newWidth } : col
      ));
    };
    
    const handleMouseUp = () => {
      setResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columns]);

  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table ref={tableRef} className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.key}
                  style={{ width: `${column.width}px`, minWidth: `${column.width}px` }}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                >
                  <div className="flex items-center justify-between">
                    <span>{column.header}</span>
                    {index < columns.length - 1 && (
                      <div
                        className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-400 hover:w-2 transition-all"
                        onMouseDown={(e) => handleMouseDown(e, index)}
                        style={{ background: resizing?.index === index ? '#3b82f6' : 'transparent' }}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''} ${rowClassName}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    style={{ width: `${column.width}px`, minWidth: `${column.width}px` }}
                    className="px-4 py-4"
                  >
                    {column.render 
                      ? column.render(row[column.key], row)
                      : (row[column.key] || '')
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResizableTable;