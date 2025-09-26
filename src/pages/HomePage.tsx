const HomePage = () => {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">
        Welcome to NJDSC School Compliance Portal
      </h1>
      <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
        Help protect consumers by reporting potentially unlicensed driving schools in New Jersey.
        Your reports help the Division of Consumer Affairs maintain safety standards.
      </p>
      <div className="space-x-4">
        <a
          href="/report"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Report an Issue
        </a>
        <a
          href="/reports"
          className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
        >
          View Reports
        </a>
      </div>
    </div>
  );
};

export default HomePage;