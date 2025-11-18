import React, { useState, useRef } from 'react';

export default function Videos() {
  // sample YouTube ids for reels (replace with real ids or urls)
  const reels = [
    '_8-_rQLztu8',
    'ysz5S6PUM-U',
    'HluANRwPyNo',
    'ScMzIvxBSi4',
    'dQw4w9WgXcQ'
  ];

  const [current, setCurrent] = useState(reels[0]);
  const [minimized, setMinimized] = useState(false);
  const reelsRef = useRef(null);

  const scrollReels = (direction = 'right') => {
    const el = reelsRef.current;
    if (!el) return;
    const amount = el.clientWidth; // scroll by container width (shows 3 items depending on item width)
    el.scrollBy({ left: direction === 'right' ? amount : -amount, behavior: 'smooth' });
  };

  return (
    <div className="bg-black min-h-screen -mt-16 w-screen flex flex-col items-center pt-0 px-4 fixed pb-4" style={{ minHeight: '91vh' }}>
      <div className={`relative w-full max-w-[960px] transition-all ${minimized ? 'h-[50vh]' : 'h-auto'}`}>
        {minimized ? (
          <div className="flex flex-col md:flex-row w-full h-full bg-black rounded-md overflow-hidden">
            <div className="w-full md:w-1/2 h-1/2 md:h-full bg-black flex items-center justify-center">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${current}?autoplay=1&mute=1&controls=1&modestbranding=1&rel=0`}
                title="Reel player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="block object-cover w-full h-full"
                style={{ background: '#000' }}
              />
            </div>

            <div className="w-full md:w-1/2 h-1/2 md:h-full bg-[#050506] overflow-hidden p-3 relative">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">Suggested</h3>
                <span className="text-sm text-gray-300">{reels.length}</span>
              </div>

              <div ref={reelsRef} className="flex gap-3  overflow-x-auto no-scrollbar py-1 snap-x snap-mandatory scroll-smooth">
                {reels.map((id, idx) => (
                  <div
                    key={id}
                    onClick={() => setCurrent(id)}
                    className={`min-w-[33.333%] flex-shrink-0 bg-[#0b0b0b] rounded-md overflow-hidden border ${current === id ? 'border-blue-500' : 'border-transparent'} cursor-pointer snap-start`}
                  >
                    <img src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`} alt={`thumb-${idx}`} className="w-full h-20 object-cover" />
                    <div className="p-2">
                      <div className="text-sm text-white truncate">Reel {idx + 1}</div>
                      <div className="text-xs text-gray-400">Short clip preview</div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                aria-label="Maximize video"
                onClick={() => setMinimized(false)}
                className="fixed md:static right-4 bottom-4 md:right-auto md:bottom-auto z-50 bg-white text-black rounded-full w-10 h-10 flex items-center justify-center shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 9.06l-3.71 3.71a.75.75 0 11-1.06-1.06l4.24-4.24a.75.75 0 011.06 0l4.24 4.24c.29.3.29.77.02 1.06z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={`relative mx-auto bg-black overflow-hidden rounded-md`} style={{ width: '100%', height: '50vh', maxHeight: '90vh' }}>
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${current}?autoplay=1&mute=1&controls=1&modestbranding=1&rel=0`}
                title="Reel player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="block object-cover w-full h-full"
                style={{ background: '#000' }}
              />

              {/* <button
                aria-label="Minimize video"
                onClick={() => setMinimized(true)}
                className="absolute top-2 right-2 z-20 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button> */}
            </div>

            <div className="mt-16 relative w-full">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-semibold">Suggested Reels</h3>
                <span className="text-sm text-gray-300">{reels.length} videos</span>
              </div>

              <div className="relative">
                <button
                  aria-label="Scroll left"
                  onClick={() => scrollReels('left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-black bg-opacity-40 text-white rounded-full w-8 h-8 items-center justify-center ml-1 hidden md:flex"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path fillRule="evenodd" d="M12.79 14.77a.75.75 0 01-.02-1.06L15.94 10l-3.17-3.71a.75.75 0 111.06-1.06l4.24 4.24a.75.75 0 010 1.06l-4.24 4.24a.75.75 0 01-1.06.02z" clipRule="evenodd" />
                  </svg>
                </button>

                <div ref={reelsRef} className="flex gap-3 h-[15rem] overflow-x-auto no-scrollbar py-1 snap-x snap-mandatory scroll-smooth" style={{ scrollBehavior: 'smooth' }}>
                  {reels.map((id, idx) => (
                    <div
                      key={id}
                      onClick={() => setCurrent(id)}
                      className={`min-w-[33.33%] min-h-[50%] flex-shrink-0 bg-[#0b0b0b] rounded-md overflow-hidden border ${current === id ? 'border-gray-500' : 'border-transparent'} cursor-pointer snap-start`}
                    >
                      <img src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`} alt={`reel-${idx}`} className="w-full h-36 object-cover" />
                      <div className="p-2 pl-3">
                        <div className="text-sm text-white truncate">Reel {idx + 1}</div>
                        <div className="text-xs text-gray-400">Short clip preview</div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  aria-label="Scroll right"
                  onClick={() => scrollReels('right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-black bg-opacity-40 text-white rounded-full w-8 h-8 items-center justify-center mr-1 hidden md:flex"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path fillRule="evenodd" d="M7.21 5.23a.75.75 0 011.06.02L10 9.06l1.73-3.81a.75.75 0 111.38.6L11.06 10l2.29 4.16a.75.75 0 11-1.34.58L10 10.94l-1.45 2.64a.75.75 0 11-1.34-.58L8.94 10 6.65 5.84a.75.75 0 01.56-1.61z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
