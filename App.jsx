import React, { useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, FileText, Loader2, PlusCircle, Trash2, TrendingUp, User, XCircle, Heart, Droplet, Brain, Pill } from 'lucide-react';

export default function LabAnalyzerApp() {
  const [activeTab, setActiveTab] = useState('analyze');
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {activeTab === 'analyze' && <AnalyzeTab />}
        {activeTab === 'about' && <AboutTab />}
      </main>
      <Footer />
    </div>
  );
}

function Header({ activeTab, setActiveTab }) {
  return (
    <header className="bg-white shadow-lg border-b-4 border-cyan-500">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500 rounded-2xl blur-lg opacity-30 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-cyan-500 to-cyan-600 p-3 rounded-2xl shadow-xl">
                <Activity className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-500 to-purple-600 bg-clip-text text-transparent">
                Lab Report Analyzer
              </h1>
              <p className="text-sm text-gray-600">AI-Powered Clinical Insights</p>
            </div>
          </div>
          
          <nav className="flex space-x-2">
            <button
              onClick={() => setActiveTab('analyze')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'analyze'
                  ? 'bg-cyan-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-cyan-50'
              }`}
            >
              Analyze
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'about'
                  ? 'bg-cyan-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-cyan-50'
              }`}
            >
              About
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}

function AnalyzeTab() {
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('male');
  const [medications, setMedications] = useState('');
  const [labValues, setLabValues] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addLabValue = () => {
    setLabValues([...labValues, { test_name: '', value: '', unit: '', panel: 'CBC' }]);
  };

  const updateLabValue = (index, field, value) => {
    const updated = [...labValues];
    updated[index][field] = value;
    setLabValues(updated);
  };

  const removeLabValue = (index) => {
    setLabValues(labValues.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!patientAge || labValues.length === 0) {
      setError("Please enter patient age and at least one lab value");
      return;
    }

    const invalidValues = labValues.filter(v => !v.test_name || !v.value);
    if (invalidValues.length > 0) {
      setError("Please fill all lab value fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Sending request to backend...');
      const response = await fetch('http://localhost:8000/analyze-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_age: parseInt(patientAge),
          patient_gender: patientGender,
          lab_values: labValues.map(v => ({
            ...v,
            value: parseFloat(v.value)
          })),
          current_medications: medications ? medications.split(',').map(m => m.trim()) : []
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Analysis failed');
      }
      
      const data = await response.json();
      console.log('Received response:', data);
      setResult(data);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || "Could not connect to backend. Make sure the backend is running on http://localhost:8000");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-cyan-500 to-purple-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between flex-wrap gap-6">
          <div className="space-y-3 flex-1">
            <h2 className="text-4xl font-bold">Comprehensive Lab Analysis</h2>
            <p className="text-white/90 text-lg max-w-2xl">
              Automated abnormality detection, pattern recognition, and clinical correlation across CBC, LFT, KFT, Lipids, Thyroid, and Glucose panels.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <StatCard icon={<Heart className="w-5 h-5" />} label="Multi-Panel" value="6 Panels" />
          <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Critical Alerts" value="Real-time" />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="eGFR Calc" value="Auto" />
          <StatCard icon={<Brain className="w-5 h-5" />} label="AI Insights" value="Groq" />
        </div>
      </div>

      {/* Input Form */}
      <div className="bg-white rounded-3xl shadow-2xl p-8 border-2 border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Patient Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Age <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              value={patientAge}
              onChange={(e) => setPatientAge(e.target.value)}
              placeholder="e.g. 45"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 transition-all outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Gender</label>
            <select
              value={patientGender}
              onChange={(e) => setPatientGender(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 transition-all outline-none"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Current Medications</label>
            <input
              type="text"
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
              placeholder="e.g. Metformin, Lisinopril"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 transition-all outline-none"
            />
          </div>
        </div>

        {/* Lab Values */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xl font-bold text-gray-900">Lab Values</h4>
            <button
              onClick={addLabValue}
              className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Value</span>
            </button>
          </div>

          {labValues.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No lab values added yet</p>
              <button
                onClick={addLabValue}
                className="px-6 py-3 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition-all font-semibold"
              >
                Add First Lab Value
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {labValues.map((lab, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
                  <select
                    value={lab.panel}
                    onChange={(e) => updateLabValue(index, 'panel', e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-300 focus:border-cyan-500 outline-none"
                  >
                    <option value="CBC">CBC</option>
                    <option value="LFT">LFT</option>
                    <option value="KFT">KFT</option>
                    <option value="Lipid">Lipid</option>
                    <option value="Thyroid">Thyroid</option>
                    <option value="Glucose">Glucose</option>
                  </select>
                  
                  <input
                    type="text"
                    value={lab.test_name}
                    onChange={(e) => updateLabValue(index, 'test_name', e.target.value)}
                    placeholder="Test Name"
                    className="px-3 py-2 rounded-lg border border-gray-300 focus:border-cyan-500 outline-none"
                  />
                  
                  <input
                    type="number"
                    step="0.01"
                    value={lab.value}
                    onChange={(e) => updateLabValue(index, 'value', e.target.value)}
                    placeholder="Value"
                    className="px-3 py-2 rounded-lg border border-gray-300 focus:border-cyan-500 outline-none"
                  />
                  
                  <input
                    type="text"
                    value={lab.unit}
                    onChange={(e) => updateLabValue(index, 'unit', e.target.value)}
                    placeholder="Unit"
                    className="px-3 py-2 rounded-lg border border-gray-300 focus:border-cyan-500 outline-none"
                  />
                  
                  <button
                    onClick={() => removeLabValue(index)}
                    className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                  >
                    <Trash2 className="w-4 h-4 mx-auto" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-cyan-600 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Activity className="w-5 h-5" />
              <span>Analyze Lab Report</span>
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start space-x-4">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900">Error</h3>
              <p className="text-red-800 mt-1">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-3 text-red-700 hover:text-red-900 font-semibold text-sm underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && <ResultsDisplay result={result} />}
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
      <div className="flex items-center space-x-3">
        <div className="text-white">{icon}</div>
        <div>
          <p className="text-xs text-white/80">{label}</p>
          <p className="text-sm font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ResultsDisplay({ result }) {
  const [showDetailed, setShowDetailed] = useState(false);
  
  // Helper to get color classes
  const getColorClasses = (color) => {
    const colorMap = {
      green: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
      yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
      red: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' }
    };
    return colorMap[color] || colorMap.green;
  };
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          label="Total Tests"
          value={result.results_summary.total_tests}
          icon={<FileText className="w-6 h-6 text-cyan-500" />}
          bgColor="bg-cyan-50"
          borderColor="border-cyan-300"
        />
        <MetricCard
          label="Normal"
          value={result.results_summary.normal_count}
          icon={<CheckCircle className="w-6 h-6 text-green-600" />}
          bgColor="bg-green-50"
          borderColor="border-green-300"
        />
        <MetricCard
          label="Abnormal"
          value={result.results_summary.abnormal_count}
          icon={<AlertTriangle className="w-6 h-6 text-amber-600" />}
          bgColor="bg-amber-50"
          borderColor="border-amber-300"
        />
        <MetricCard
          label="Critical"
          value={result.results_summary.critical_count}
          icon={<XCircle className="w-6 h-6 text-red-600" />}
          bgColor="bg-red-50"
          borderColor="border-red-300"
        />
      </div>

      {/* Critical Values Alert */}
      {result.critical_values.length > 0 && (
        <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start space-x-4">
            <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-red-900 mb-3">⚠️ CRITICAL VALUES DETECTED</h3>
              <div className="space-y-2">
                {result.critical_values.map((val, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-4">
                    <p className="font-bold text-gray-900">{val.test}: <span className="text-red-600">{val.value} {val.unit}</span></p>
                    <p className="text-sm text-gray-600">Reference: {val.reference_range}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-red-800 mt-4 font-semibold">⚡ Immediate physician review required</p>
            </div>
          </div>
        </div>
      )}

      {/* Calculated Metrics */}
      {result.calculated_metrics.egfr && (
        <div className="bg-gradient-to-br from-cyan-50 to-purple-50 rounded-3xl p-8 border-2 border-cyan-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <Activity className="w-6 h-6 mr-2 text-cyan-500" />
            Kidney Function (eGFR)
          </h3>
          <div className="bg-white rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold text-gray-900">{result.calculated_metrics.egfr} mL/min/1.73m²</p>
                <p className="text-lg text-gray-600 mt-2">{result.calculated_metrics.egfr_interpretation?.description}</p>
                <p className="text-sm font-semibold text-gray-600 mt-1">Stage: {result.calculated_metrics.egfr_interpretation?.stage}</p>
              </div>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getColorClasses(result.calculated_metrics.egfr_interpretation?.color).bg}`}>
                <Droplet className={`w-8 h-8 ${getColorClasses(result.calculated_metrics.egfr_interpretation?.color).text}`} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cholesterol Ratios */}
      {result.calculated_metrics.cholesterol_ratios && Object.keys(result.calculated_metrics.cholesterol_ratios).length > 0 && (
        <div className="bg-white rounded-3xl p-8 shadow-2xl border-2 border-gray-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Heart className="w-6 h-6 mr-2 text-red-500" />
            Cardiac Risk Assessment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(result.calculated_metrics.cholesterol_ratios).map(([key, value]) => (
              <div key={key} className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                <p className="text-sm text-gray-600 font-semibold">{key.replace(/_/g, ' / ')}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
              </div>
            ))}
          </div>
          {result.calculated_metrics.cardiac_risk && (
            <div className={`mt-4 p-4 rounded-xl ${getColorClasses(result.calculated_metrics.cardiac_risk.color).bg} border-2 ${getColorClasses(result.calculated_metrics.cardiac_risk.color).border}`}>
              <p className="text-lg font-bold text-gray-900">
                Cardiac Risk: <span className={getColorClasses(result.calculated_metrics.cardiac_risk.color).text}>{result.calculated_metrics.cardiac_risk.risk}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Abnormalities Table */}
      {result.abnormalities.length > 0 && (
        <div className="bg-white rounded-3xl p-8 shadow-2xl border-2 border-gray-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Abnormal Values</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left p-3 text-gray-900 font-semibold">Test</th>
                  <th className="text-left p-3 text-gray-900 font-semibold">Value</th>
                  <th className="text-left p-3 text-gray-900 font-semibold">Reference</th>
                  <th className="text-left p-3 text-gray-900 font-semibold">Severity</th>
                </tr>
              </thead>
              <tbody>
                {result.abnormalities.map((abn, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-semibold text-gray-900">{abn.test}</td>
                    <td className="p-3 text-gray-900">{abn.value} {abn.unit}</td>
                    <td className="p-3 text-gray-600">{abn.reference_range}</td>
                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getColorClasses(abn.color).bg} ${getColorClasses(abn.color).text}`}>
                        {abn.severity.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Physician Summary */}
      <div className="bg-gradient-to-br from-purple-50 to-cyan-50 rounded-3xl p-8 border-2 border-purple-200">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded">
          <p className="text-sm text-blue-900 font-semibold">
            ⚕️ CDSS Notice: This summary provides decision support insights based on available data and does not constitute a definitive diagnosis or treatment directive. All findings require physician review and clinical correlation.
          </p>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Physician Summary</h3>
        <div className="bg-white rounded-xl p-6 text-gray-900 leading-relaxed">
          {result.physician_summary}
        </div>
      </div>

      {/* Detailed Analysis */}
      <div className="bg-white rounded-3xl p-8 shadow-2xl border-2 border-gray-100">
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4 rounded">
          <p className="text-sm text-amber-900 font-semibold">
            ℹ️ Clinical Decision Support: This analysis provides interpretive guidance and does not replace clinical judgment. All recommendations are suggestions for physician consideration, not treatment directives.
          </p>
        </div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-gray-900">Detailed Clinical Analysis</h3>
          <button
            onClick={() => setShowDetailed(!showDetailed)}
            className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-all"
          >
            {showDetailed ? 'Hide' : 'Show'} Details
          </button>
        </div>
        
        {showDetailed && (
          <div className="bg-gray-50 rounded-xl p-6 text-gray-900 leading-relaxed whitespace-pre-wrap">
            {result.detailed_analysis}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, bgColor, borderColor }) {
  return (
    <div className={`rounded-2xl p-6 border-2 ${bgColor} ${borderColor} shadow-lg`}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-gray-600">{label}</p>
        {icon}
      </div>
      <p className="text-4xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function AboutTab() {
  return (
    <div className="bg-white rounded-3xl shadow-2xl p-8 border-2 border-gray-100">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">About Lab Report Analyzer</h2>
      <div className="space-y-4 text-gray-600">
        <p className="text-lg text-gray-900">
          Comprehensive AI-powered laboratory report analysis system with automated abnormality detection, 
          pattern recognition, and clinical correlation across multiple test panels.
        </p>
        
        <div className="mt-6">
          <h3 className="text-xl font-bold text-gray-900 mb-3">Features</h3>
          <ul className="space-y-2 ml-4">
            <li className="flex items-start">
              <span className="text-cyan-500 mr-2">•</span>
              <span><strong>Multi-Panel Analysis:</strong> CBC, LFT, KFT, Lipids, Thyroid, Glucose</span>
            </li>
            <li className="flex items-start">
              <span className="text-cyan-500 mr-2">•</span>
              <span><strong>Severity Color Coding:</strong> Visual indicators for mild, moderate, severe abnormalities</span>
            </li>
            <li className="flex items-start">
              <span className="text-cyan-500 mr-2">•</span>
              <span><strong>Pattern Recognition:</strong> Anemia classification, liver disease patterns</span>
            </li>
            <li className="flex items-start">
              <span className="text-cyan-500 mr-2">•</span>
              <span><strong>Critical Value Flagging:</strong> Life-threatening abnormalities highlighted</span>
            </li>
            <li className="flex items-start">
              <span className="text-cyan-600 mr-2">•</span>
              <span><strong>Auto-Calculations:</strong> eGFR, cholesterol ratios, cardiac risk</span>
            </li>
            <li className="flex items-start">
              <span className="text-cyan-600 mr-2">•</span>
              <span><strong>Clinical Correlation:</strong> AI explains relationships between values</span>
            </li>
            <li className="flex items-start">
              <span className="text-cyan-600 mr-2">•</span>
              <span><strong>Drug-Lab Interactions:</strong> Warns of expected medication effects</span>
            </li>
          </ul>
        </div>

        <div className="mt-6">
          <h3 className="text-xl font-bold text-gray-900 mb-3">Technology</h3>
          <p><strong>AI Engine:</strong> Groq LLaMA 3.1 for clinical analysis</p>
          <p><strong>Backend:</strong> FastAPI with comprehensive reference ranges</p>
          <p><strong>Frontend:</strong> React with Tailwind CSS</p>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-sm text-gray-600">
          <p className="font-semibold mb-2 text-gray-900">Lab Report Analyzer v1.0</p>
          <p>Powered by Groq AI · FastAPI · React</p>
          <p className="text-xs mt-2">For informational purposes only - Not a substitute for professional medical advice</p>
        </div>
      </div>
    </footer>
  );
}