'use client'

export default function TestPage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-semibold text-gray-900">🎬 Films Module Test</h1>
      </div>
      
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium mb-4">Films Module Test</h2>
          <p className="text-green-600">✅ Page loads successfully!</p>
          <p className="text-gray-600 mt-2">This confirms the routing and basic layout work.</p>
          
          <div className="mt-4">
            <h3 className="font-medium">Next steps:</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 mt-2">
              <li>Test database connection</li>
              <li>Test data loading</li>
              <li>Test grid component</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}