import React from 'react';

export default function Videos() {
  return (
    <div className="bg-black min-h-screen w-screen flex flex-col justify-center items-center p-0 m-0" style={{height:'100dvh',overflow:'hidden'}}>
      <div className="relative flex items-center justify-center w-full h-full min-h-screen" style={{height:'100dvh'}}>
        <div
          className="relative flex items-center justify-center mx-auto"
          style={{
            width: 'min(100vw, 430px)',
            height: 'calc(min(100vw, 430px) * 16 / 9)',
            maxHeight: '100dvh',
            background: '#000',
            borderRadius: '0',
            overflow: 'hidden',
          }}
        >
        <iframe
        width="100%"
        height="100%"
        src="https://www.youtube.com/embed/_8-_rQLztu8?autoplay=1&mute=1&controls=1&modestbranding=1&rel=0&loop=1&playlist=_8-_rQLztu8"
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="block object-cover w-full h-full"
        style={{ aspectRatio: '9/16', background: '#000' }}
      ></iframe>
        </div>
      </div>
    </div>
  );
}
