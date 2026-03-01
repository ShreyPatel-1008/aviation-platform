export default function RootLoading() {
    return (
        <div
            style={{
                width: '100vw',
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                    'radial-gradient(circle at top, rgba(59,130,246,0.18), transparent 55%), radial-gradient(circle at bottom, rgba(56,189,248,0.18), #020617)',
            }}
        >
            <div
                style={{ width: 'min(200px, 40vw)', height: 'min(200px, 40vw)' }}
                dangerouslySetInnerHTML={{
                    __html:
                        '<dotlottie-wc src="https://lottie.host/28231d9e-8b90-44f2-9227-1f01d2966866/HasQXK9Rdv.lottie" style="width: 100%; height: 100%" autoplay loop></dotlottie-wc>',
                }}
            />
        </div>
    );
}

