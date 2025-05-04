import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-background py-4 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center">
          <p className="text-text-secondary text-sm">
            &copy; {new Date().getFullYear()} All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;