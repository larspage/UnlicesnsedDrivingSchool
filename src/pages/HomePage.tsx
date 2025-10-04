const HomePage = () => {
  return (
    <div className="text-center px-4">
      <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-4">
        Welcome to NJDSC School Compliance Portal
      </h1>
      <p className="text-base md:text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
        Help protect the students and the public by reporting potentially unlicensed driving schools in New Jersey.
        Your reports help the Motor Vehicle Commission to maintain safety standards.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
        <a
          href="/report"
          className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-center text-sm font-medium"
        >
          Report an Issue
        </a>
        <a
          href="/reports"
          className="w-full sm:w-auto bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors text-center text-sm font-medium"
        >
          View Reports
        </a>
      </div>
    </div>
  );
};

export default HomePage;