'use client';

interface LoadingAnimationProps {
    message?: string;
    fullScreen?: boolean;
}

export default function LoadingAnimation({ message, fullScreen = false }: LoadingAnimationProps) {
    const containerStyle: React.CSSProperties = fullScreen
        ? {
            width: '100%',
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 16px',
        }
        : {
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 16px',
        };

    return (
        <div style={containerStyle}>
            <div
                style={{ width: 'min(200px, 40vw)', height: 'min(200px, 40vw)' }}
                dangerouslySetInnerHTML={{
                    __html:
                        '<dotlottie-wc src="https://lottie.host/28231d9e-8b90-44f2-9227-1f01d2966866/HasQXK9Rdv.lottie" style="width: 100%; height: 100%" autoplay loop></dotlottie-wc>',
                }}
            />
            {message && (
                <p style={{ marginTop: '12px', fontSize: '0.9rem', opacity: 0.7 }}>
                    {message}
                </p>
            )}
        </div>
    );
}

