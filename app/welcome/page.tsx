'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

// ── 型 ──────────────────────────────────────────────────────────────────────────

interface Particle {
  x: number; y: number; vx: number; vy: number
  alpha: number; fade: number; size: number; color: string
}
interface Star {
  x: number; y: number; vx: number; vy: number
  trail: Array<{ x: number; y: number }>
  color: string; active: boolean
}
type Phase = 'stars' | 'infinity' | 'text' | 'door'

const GOLD   = '#c9a84c'
const PURPLE = '#8a5aff'

// ── ヘルパー ──────────────────────────────────────────────────────────────────

function makeParticle(x: number, y: number, color: string): Particle {
  const a = Math.random() * Math.PI * 2, s = 0.4 + Math.random() * 1.2
  return { x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s,
    alpha: 0.7+Math.random()*0.3, fade: 0.01+Math.random()*0.01,
    size: 1+Math.random()*2, color }
}
function lemni(t: number, cx: number, cy: number, a: number) {
  const s2 = Math.sin(t)**2, d = 1+s2
  return { x: cx + a*Math.cos(t)/d, y: cy + a*Math.sin(t)*Math.cos(t)/d }
}
const easeInOut = (t: number) => t < 0.5 ? 4*t**3 : 1-(-2*t+2)**3/2

// ── コンポーネント ────────────────────────────────────────────────────────────

export default function WelcomePage() {
  const router = useRouter()

  // canvas / text
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [textVis,  setTextVis]  = useState(false)
  const [username, setUsername] = useState('')

  // 扉
  const leftDoorRef  = useRef<HTMLDivElement>(null)
  const rightDoorRef = useRef<HTMLDivElement>(null)
  const flashRef     = useRef<HTMLDivElement>(null)
  const doorShownRef = useRef(false)
  const [showDoors, setShowDoors] = useState(false)

  useEffect(() => {
    setUsername(sessionStorage.getItem('username') ?? '')
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement!
    const W = canvas.width  = parent.clientWidth  || 390
    const H = canvas.height = parent.clientHeight || window.innerHeight
    const ctx = canvas.getContext('2d')!
    const cx = W / 2, cy = H * 0.26, a = 75

    let phase: Phase = 'stars'
    let frame        = 0
    const particles: Particle[] = []

    const star1: Star = { x:-140, y:cy-28, vx:16, vy:1.5,  trail:[], color:GOLD,   active:true  }
    const star2: Star = { x:-140, y:cy+22, vx:13, vy:-1.2, trail:[], color:PURPLE, active:false }

    let t = -Math.PI
    const tMax = Math.PI
    const pts: Array<{ x:number; y:number; color:string }> = []

    let waitFrames   = 0
    let doorProgress = 0
    let navigated    = false

    const addPtc = (x: number, y: number, col: string, n=1) => {
      for (let i=0; i<n; i++) particles.push(makeParticle(x, y, col))
    }
    const updatePtc = () => {
      for (let i=particles.length-1; i>=0; i--) {
        const p=particles[i]; p.x+=p.vx; p.y+=p.vy; p.vy+=0.018; p.alpha-=p.fade
        if (p.alpha<=0) particles.splice(i,1)
      }
    }
    const drawPtc = () => {
      for (const p of particles) {
        ctx.save(); ctx.globalAlpha=p.alpha; ctx.fillStyle=p.color
        ctx.shadowBlur=6; ctx.shadowColor=p.color
        ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill(); ctx.restore()
      }
    }
    const redrawInfinity = (alpha=1) => {
      if (pts.length<2) return
      ctx.save(); ctx.globalAlpha=alpha; let i=0
      while (i<pts.length) {
        const col=pts[i].color; ctx.strokeStyle=col; ctx.lineWidth=9
        ctx.lineCap='round'; ctx.lineJoin='round'; ctx.shadowBlur=14; ctx.shadowColor=col
        ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); let j=i+1
        while (j<pts.length && pts[j].color===col) { ctx.lineTo(pts[j].x,pts[j].y); j++ }
        ctx.stroke(); i=j
      }
      ctx.restore()
    }

    let rafId: number
    const loop = () => {
      ctx.clearRect(0,0,W,H); frame++

      // 背景グロー
      const g1=ctx.createRadialGradient(W*.28,cy,0,W*.28,cy,200)
      g1.addColorStop(0,'rgba(201,168,76,0.07)'); g1.addColorStop(1,'transparent')
      ctx.fillStyle=g1; ctx.fillRect(0,0,W,H)
      const g2=ctx.createRadialGradient(W*.72,cy,0,W*.72,cy,200)
      g2.addColorStop(0,'rgba(138,90,255,0.07)'); g2.addColorStop(1,'transparent')
      ctx.fillStyle=g2; ctx.fillRect(0,0,W,H)

      // ── Phase 0: 流れ星 ────────────────────────────────────────────────────
      if (phase==='stars') {
        if (frame>=20) star2.active=true
        for (const star of [star1,star2]) {
          if (!star.active) continue
          star.trail.push({x:star.x,y:star.y})
          if (star.trail.length>22) star.trail.shift()
          star.x+=star.vx; star.y+=star.vy
          for (let i=0; i<star.trail.length-1; i++) {
            ctx.save(); ctx.globalAlpha=(i/star.trail.length)*0.85
            ctx.strokeStyle=star.color; ctx.lineWidth=2.8-(star.trail.length-i)*0.09
            ctx.shadowBlur=10; ctx.shadowColor=star.color
            ctx.beginPath(); ctx.moveTo(star.trail[i].x,star.trail[i].y)
            ctx.lineTo(star.trail[i+1].x,star.trail[i+1].y); ctx.stroke(); ctx.restore()
          }
          ctx.save(); ctx.shadowBlur=18; ctx.shadowColor=star.color
          ctx.fillStyle=star.color; ctx.globalAlpha=0.95
          ctx.beginPath(); ctx.arc(star.x,star.y,3.5,0,Math.PI*2); ctx.fill(); ctx.restore()
          if (Math.random()<0.4) addPtc(star.x,star.y,star.color)
        }
        updatePtc(); drawPtc()
        if (star1.x>W+80 && (star2.active?star2.x>W+80:frame>80)) {
          phase='infinity'; t=-Math.PI; frame=0
        }
      }

      // ── Phase 1: ∞ 描画 ────────────────────────────────────────────────────
      else if (phase==='infinity') {
        redrawInfinity()
        if (t<tMax) {
          t+=0.050; const pt=lemni(t,cx,cy,a), col=pt.x<cx?GOLD:PURPLE
          pts.push({...pt,color:col})
          ctx.save(); ctx.shadowBlur=14; ctx.shadowColor=col
          ctx.fillStyle=col; ctx.globalAlpha=0.92
          ctx.beginPath(); ctx.arc(pt.x,pt.y,4.5,0,Math.PI*2); ctx.fill(); ctx.restore()
          if (Math.random()<0.38) addPtc(pt.x,pt.y,col)
        } else {
          phase='text'; setTextVis(true); frame=0; waitFrames=0
        }
        updatePtc(); drawPtc()
      }

      // ── Phase 2: テキスト表示・3秒待機 ────────────────────────────────────
      else if (phase==='text') {
        redrawInfinity(0.82)
        if (Math.random()<0.06) {
          const ang=Math.random()*Math.PI*2, r=55+Math.random()*28
          addPtc(cx+Math.cos(ang)*r, cy+Math.sin(ang)*r*0.55, Math.random()<0.5?GOLD:PURPLE)
        }
        updatePtc(); drawPtc()
        waitFrames++
        if (waitFrames>=180) { phase='door'; frame=0 }
      }

      // ── Phase 3: 両開き扉 ──────────────────────────────────────────────────
      else if (phase==='door') {
        // canvas と テキストを非表示（初回のみ）
        if (!doorShownRef.current) {
          doorShownRef.current = true
          setShowDoors(true)
          if (canvasRef.current) {
            canvasRef.current.style.transition = 'opacity 0.3s ease'
            canvasRef.current.style.opacity    = '0'
          }
          if (contentRef.current) {
            contentRef.current.style.transition = 'opacity 0.3s ease'
            contentRef.current.style.opacity    = '0'
          }
        }

        doorProgress = Math.min(doorProgress + 0.006, 1)
        const e = easeInOut(doorProgress)

        if (leftDoorRef.current) {
          leftDoorRef.current.style.transform = `rotateY(${e * 88}deg)`
          leftDoorRef.current.style.filter    = `brightness(${1 - e * 0.85})`
        }
        if (rightDoorRef.current) {
          rightDoorRef.current.style.transform = `rotateY(${e * -88}deg)`
          rightDoorRef.current.style.filter    = `brightness(${1 - e * 0.85})`
        }

        // フラッシュ progress 0.7 → 1.0
        if (doorProgress >= 0.7 && flashRef.current) {
          flashRef.current.style.opacity = String(Math.min(1, (doorProgress - 0.7) / 0.3))
        }

        if (doorProgress >= 1 && !navigated) {
          navigated = true
          router.push('/process-map?step=1')
        }
      }

      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [router])

  return (
    <div style={{
      width:'100%', maxWidth:390, margin:'0 auto',
      height:'100svh', background:'#080808',
      position:'relative', overflow:'hidden',
    }}>
      {/* Canvas */}
      <canvas ref={canvasRef} style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%' }} />

      {/* テキスト */}
      <div ref={contentRef} style={{
        position:'absolute', inset:0,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start',
        paddingTop:'calc(26svh + 110px)',
        zIndex:1,
        opacity: textVis ? 1 : 0,
        transition:'opacity 1.2s ease',
        pointerEvents:'none',
      }}>
        <p style={{ fontSize:16, color:'#c0c0c0', letterSpacing:'0.1em', marginBottom:14 }}>
          Welcome
        </p>
        <p style={{ fontSize:26, fontWeight:600, color:'#f0f0f0', marginBottom:14, lineHeight:1.4, textAlign:'center' }}>
          {username ? `${username}さん、ようこそ。` : 'ようこそ。'}
        </p>
        <p style={{ fontSize:18, fontWeight:700, color:'#f0f0f0', lineHeight:1.8, textAlign:'center' }}>
          あなたの物語が、<br />今動き始めました。
        </p>
      </div>

      {/* ── 両開き扉 ── */}
      {showDoors && (
        <div style={{
          position:'absolute', inset:0, zIndex:3,
          display:'flex', perspective:'1200px',
          perspectiveOrigin:'50% 50%',
          overflow:'hidden',
          pointerEvents:'none',
        }}>

          {/* 左扉 */}
          <div ref={leftDoorRef} style={{
            width:'50%', height:'100%', flexShrink:0,
            transformOrigin:'left center', transform:'rotateY(0deg)',
            background:'linear-gradient(to right, #1c1628, #12101c, #0c0a14)',
            position:'relative',
            backfaceVisibility:'hidden',
          }}>
            {/* 上パネル */}
            <div style={{
              position:'absolute', top:'10%', left:'8%', right:'8%', height:'38%',
              border:'0.5px solid rgba(201,168,76,0.15)', borderRadius:1,
            }} />
            {/* 下パネル */}
            <div style={{
              position:'absolute', top:'52%', left:'8%', right:'8%', height:'38%',
              border:'0.5px solid rgba(201,168,76,0.15)', borderRadius:1,
            }} />
            {/* 中央モールディング */}
            <div style={{
              position:'absolute', top:'50%', left:'5%', right:'5%', height:1,
              background:'rgba(201,168,76,0.10)',
            }} />
            {/* ノブ（右端） */}
            <div style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)' }}>
              <div style={{
                width:10, height:36, borderRadius:2,
                background:'rgba(160,120,30,0.35)',
                border:'0.5px solid rgba(201,168,76,0.5)',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <div style={{
                  width:12, height:12, borderRadius:'50%',
                  background:'radial-gradient(circle at 35% 35%, #f5e090, #8a5020)',
                  boxShadow:'0 0 8px rgba(201,168,76,0.7)',
                }} />
              </div>
            </div>
          </div>


          {/* 右扉 */}
          <div ref={rightDoorRef} style={{
            width:'50%', height:'100%', flexShrink:0,
            transformOrigin:'right center', transform:'rotateY(0deg)',
            background:'linear-gradient(to left, #1c1628, #12101c, #0c0a14)',
            position:'relative',
            backfaceVisibility:'hidden',
          }}>
            {/* 上パネル */}
            <div style={{
              position:'absolute', top:'10%', left:'8%', right:'8%', height:'38%',
              border:'0.5px solid rgba(201,168,76,0.15)', borderRadius:1,
            }} />
            {/* 下パネル */}
            <div style={{
              position:'absolute', top:'52%', left:'8%', right:'8%', height:'38%',
              border:'0.5px solid rgba(201,168,76,0.15)', borderRadius:1,
            }} />
            {/* 中央モールディング */}
            <div style={{
              position:'absolute', top:'50%', left:'5%', right:'5%', height:1,
              background:'rgba(201,168,76,0.10)',
            }} />
            {/* ノブ（左端） */}
            <div style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)' }}>
              <div style={{
                width:10, height:36, borderRadius:2,
                background:'rgba(160,120,30,0.35)',
                border:'0.5px solid rgba(201,168,76,0.5)',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <div style={{
                  width:12, height:12, borderRadius:'50%',
                  background:'radial-gradient(circle at 35% 35%, #f5e090, #8a5020)',
                  boxShadow:'0 0 8px rgba(201,168,76,0.7)',
                }} />
              </div>
            </div>
          </div>

          {/* フラッシュオーバーレイ */}
          <div ref={flashRef} style={{
            position:'absolute', inset:0, zIndex:2, opacity:0,
            background:'radial-gradient(circle at 50% 50%, white 0%, rgba(255,255,255,0.9) 40%, rgba(255,255,255,0.4) 70%, transparent 100%)',
            pointerEvents:'none',
          }} />

        </div>
      )}
    </div>
  )
}
