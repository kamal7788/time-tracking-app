"""Loading states and skeleton screens for better user experience."""
'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  animated?: boolean
}

function Skeleton({ className, animated = true }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200',
        animated && 'animate-pulse',
        className
      )}
    />
  )
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-3',
    xl: 'h-12 w-12 border-4',
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-solid border-current border-t-transparent',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

interface LoadingOverlayProps {
  isLoading: boolean
  children: React.ReactNode
  className?: string
  spinnerSize?: 'sm' | 'md' | 'lg' | 'xl'
  text?: string
}

function LoadingOverlay({
  isLoading,
  children,
  className,
  spinnerSize = 'md',
  text,
}: LoadingOverlayProps) {
  if (!isLoading) return <>{children}</>

  return (
    <div className={cn('relative', className)}>
      {children}
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
        <LoadingSpinner size={spinnerSize} className="text-blue-600" />
        {text && <p className="mt-2 text-sm text-gray-600">{text}</p>}
      </div>
    </div>
  )
}

interface ProgressiveImageProps {
  src: string
  alt: string
  placeholder?: React.ReactNode
  className?: string
  onLoad?: () => void
}

function ProgressiveImage({
  src,
  alt,
  placeholder,
  className,
  onLoad,
}: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = React.useState(false)
  const [error, setError] = React.useState(false)

  return (
    <div className={cn('relative', className)}>
      {!isLoaded && !error && (
        <div className="absolute inset-0 animate-pulse bg-gray-200 rounded" />
      )}
      {error ? (
        <div className="flex items-center justify-center bg-gray-100 rounded text-gray-500">
          Failed to load image
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={cn('w-full h-full object-cover', isLoaded ? 'block' : 'hidden')}
          onLoad={() => {
            setIsLoaded(true)
            onLoad?.()
          }}
          onError={() => setError(true)}
        />
      )}
    </div>
  )
}

// Hook for lazy loading components
function useLazyLoad<T>(
  loadFunction: () => Promise<T>,
  deps: React.DependencyList = []
) {
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    if (!data && !error) {
      setLoading(true)
      loadFunction()
        .then(setData)
        .catch(setError)
        .finally(() => setLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, data, error])

  return { data, loading, error }
}

export {
  Skeleton,
  LoadingSpinner,
  LoadingOverlay,
  ProgressiveImage,
  useLazyLoad,
}
