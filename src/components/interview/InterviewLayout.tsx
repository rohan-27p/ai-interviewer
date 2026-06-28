import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface InterviewLayoutProps {
    children: React.ReactNode;
}

export function InterviewLayout({ children }: InterviewLayoutProps) {
    return (
        <div className="h-screen w-full bg-background text-foreground flex overflow-hidden">
            <ToastContainer />
            {children}
        </div>
    );
}
