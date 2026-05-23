import { useNavigate } from 'react-router-dom';

export default function PageLayout({ children, maxWidth = 'max-w-lg', showBackButton = false, onBack = null }) {
  const navigate = useNavigate();
  
  const handleBack = onBack ? onBack : () => navigate(-1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-800 text-lg">MediBook</span>
          </div>
          {showBackButton && (
            <button 
              onClick={handleBack}
              className="text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 transition hover:bg-gray-50 flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 12l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`mx-auto px-4 py-8 ${maxWidth}`}>
        {children}
      </div>
    </div>
  );
}
