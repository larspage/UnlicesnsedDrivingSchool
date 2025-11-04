const Footer = () => {
  return (
    <footer className="border-t border-gray-300 mt-6">
      <div className="container mx-auto px-4 py-2">
        <div className="text-center text-white text-sm">
          <p className="mb-0 leading-tight">
            New Jersey Driving School Council - School Compliance Portal
          </p>
          <p className="text-xs leading-tight my-1">
            Report unlicensed driving schools to help keep New Jersey safe.
          </p>
          <p className="text-xs leading-tight mt-1 mb-0">
            © 2025 NJDSC. All rights reserved.
          </p>
          <div className="border-t border-gray-400 my-2 mx-auto w-16"></div>
          <p className="text-xs leading-tight mt-1 mb-0">
            Developed by Mr Brooks Products & Services, LLC.{' '}
            <a href="mailto:lawrence.farrell@gmail.com" className="text-blue-300 hover:text-blue-200 underline">
              lawrence.farrell@gmail.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;