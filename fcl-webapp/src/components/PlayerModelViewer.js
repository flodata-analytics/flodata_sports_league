import React from 'react';

// Simple lazy loader for the <model-viewer> web component to show a .glb.
export default function PlayerModelViewer({ modelUrl, poster, alt = 'Player 3D model', className = '', style = {} }) {
	const [ready, setReady] = React.useState(false);
	const [error, setError] = React.useState(false);

	React.useEffect(() => {
		let cancelled = false;
		const ensure = async () => {
			try {
				if (window.customElements?.get?.('model-viewer')) { 
					if (!cancelled) setReady(true); 
					return; 
				}
			} catch (err) {
				console.warn('Custom elements check failed:', err);
			}
			const id = 'mv-cdn-script';
			const existing = document.getElementById(id);
			if (existing) { 
				// Wait a bit for the script to parse
				setTimeout(() => {
					if (!cancelled && window.customElements?.get?.('model-viewer')) {
						setReady(true);
					}
				}, 100);
				return; 
			}
			const s = document.createElement('script');
			s.id = id; 
			s.type = 'module';
			s.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
			s.onload = () => { 
				if (!cancelled) {
					// Small delay to ensure custom element is registered
					setTimeout(() => setReady(true), 50);
				}
			};
			s.onerror = (e) => { 
				console.error('Failed to load model-viewer script:', e);
				if (!cancelled) {
					setError(true);
					setReady(false);
				}
			};
			document.head.appendChild(s);
		};
		ensure();
		return () => { cancelled = true; };
	}, []);

	const containerStyle = {
		width: '100%',
		height: '100%',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
		background: 'transparent',
		position: 'relative',
		...style,
	};

	const effectiveSrc = modelUrl || '/model.glb';
	
	if (error) {
		return (
			<div className={className} style={containerStyle}>
				{poster ? (
					<img src={poster} alt={alt} style={{width:'100%',height:'100%',objectFit:'cover'}} />
				) : (
					<div style={{fontSize:12,color:'#999'}}>3D viewer unavailable</div>
				)}
			</div>
		);
	}

	return (
		<div className={className} style={containerStyle}>
			{!ready ? (
				poster ? (
					<img src={poster} alt={alt} style={{width:'100%',height:'100%',objectFit:'cover'}} />
				) : (
					<div style={{fontSize:12,color:'#666'}}>Loading 3D…</div>
				)
			) : (
				// eslint-disable-next-line jsx-a11y/alt-text
				<model-viewer
					src={effectiveSrc}
					alt={alt}
					poster={poster || ''}
					camera-controls
					auto-rotate
					auto-rotate-delay="0"
					rotation-per-second="0.8"
						  /* Shift the camera target upward so the face is centered (cuts lower body),
							  and slightly tighten radius limits so the model appears a bit more zoomed-in. */
						  camera-target="0m 0.5m 0m"
						  camera-orbit="0deg 70deg 1.9m"
						  min-camera-orbit="0deg 55deg 1.2m"
						  max-camera-orbit="360deg 85deg 2.6m"
					interaction-prompt="none"
					loading="eager"
					reveal="auto"
					shadow-intensity="1"
					exposure="1"
					style={{
						height:'100%',
						width:'100%',
						display:'block',
						background:'transparent',
						objectFit: 'contain',
						minHeight: 0
					}}
				/>
			)}
		</div>
	);
}
