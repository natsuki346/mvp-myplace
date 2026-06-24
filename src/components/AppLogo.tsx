import DaisyFlower from '@/src/components/DaisyFlower'

type AppLogoSize = 'sm' | 'lg'

const PIXEL_SIZE: Record<AppLogoSize, number> = {
  sm: 72,
  lg: 150,
}

// ウェルカム画面で使っているデイジーのロゴ（DaisyFlower）を共通化したコンポーネント。
export default function AppLogo({ size = 'lg' }: { size?: AppLogoSize }) {
  return <DaisyFlower size={PIXEL_SIZE[size]} animate />
}
