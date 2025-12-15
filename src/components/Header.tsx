import logo from '@/assets/logo.png';

const Header = () => {
  return (
    <header className="w-full border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src={logo} 
            alt="Ypsom Partners" 
            className="h-12 w-auto"
          />
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-serif text-foreground">Financial Document Processor</span>
          <span className="text-border">|</span>
          <span>AI-Powered Extraction</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
