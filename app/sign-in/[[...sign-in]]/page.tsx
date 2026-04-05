import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-[#111] border border-[#222] shadow-2xl',
            headerTitle: 'text-white',
            headerSubtitle: 'text-gray-400',
            socialButtonsBlockButton: 'bg-[#1a1a1a] border-[#333] text-white hover:bg-[#222]',
            formFieldInput: 'bg-[#1a1a1a] border-[#333] text-white',
            formButtonPrimary: 'bg-white text-black hover:bg-gray-200',
            footerActionLink: 'text-blue-400 hover:text-blue-300',
          },
        }}
        fallbackRedirectUrl="/"
      />
    </div>
  );
}
