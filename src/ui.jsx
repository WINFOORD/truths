export const rnd=a=>a[Math.floor(Math.random()*a.length)]
export const buzz=n=>{try{navigator.vibrate&&navigator.vibrate(n||12)}catch(e){}}
const P={
  play:'M7 4.8v14.4a1 1 0 001.5.86l11.6-7.2a1 1 0 000-1.72L8.5 3.94A1 1 0 007 4.8z',
  pen:'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z',
  user:'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  spark:'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z',
  trash:'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
  check:'M5 12.5l4.5 4.5L19 7',
  x:'M6 6l12 12M18 6L6 18',
  refresh:'M20 12a8 8 0 11-2.4-5.7M20 4v5h-5',
  out:'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h9',
  copy:'M9 9h11v11H9zM5 15V5h10',
  gear:'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  home:'M4 11l8-7 8 7M6 10v10h12V10M10 20v-5h4v5',
  tot:'M7 4v16M7 4L4 7M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3',
  pin:'M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  plus:'M12 5v14M5 12h14',
  help:'M9.5 9a2.5 2.5 0 114 2c-.9.7-1.5 1.2-1.5 2.3M12 17h.01'
}
export const Ic=({n,s=22})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={P[n]}/></svg>
