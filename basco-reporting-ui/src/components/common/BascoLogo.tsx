import bascoLogoImg from "../../assets/basco-logo.jpeg";

interface BascoLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showText?: boolean
  textColor?: string
}

const sizeMap = {
  xs: 'h-4 w-auto',
  sm: 'h-6 w-auto',
  md: 'h-8 w-auto',
  lg: 'h-10 w-auto',
  xl: 'h-14 w-auto',
}

export default function BascoLogo({
  size = 'md',
  className = '',
  showText = false,
  textColor = 'text-white',
}: BascoLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src={bascoLogoImg}
        alt="BASCO Logo"
        className={`${sizeMap[size]} object-contain shrink-0 drop-shadow-md select-none mix-blend-multiply`}
      />
      {showText && (
        <div className="flex flex-col">
          <span className={`font-extrabold tracking-tight leading-none ${textColor} ${
            size === 'lg' || size === 'xl' ? 'text-2xl' : size === 'md' ? 'text-base' : 'text-sm'
          }`}>
            BASCO
          </span>
          <span className="text-[10px] text-gray-400 font-medium tracking-wide leading-none mt-1">
            Intelligence Portal
          </span>
        </div>
      )}
    </div>
  )
}
