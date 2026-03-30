import React from 'react'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  className?: string
  disabled?: boolean
}

export function PhoneInput({ value, onChange, placeholder = "700123456", required, className, disabled }: PhoneInputProps) {
  const formatPhoneNumber = (input: string) => {
    // Remove all non-digits
    let cleaned = input.replace(/[^0-9]/g, '')
    
    // Handle different input formats
    if (cleaned.length > 0) {
      // Remove existing +254 or 254 prefix
      if (cleaned.startsWith('254')) {
        cleaned = cleaned.substring(3)
      }
      // Remove leading 0
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1)
      }
      // Ensure it starts with valid Kenyan prefixes and format
      if (cleaned.length > 0) {
        return '+254' + cleaned
      }
    }
    return ''
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    onChange(formatted)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')
    const formatted = formatPhoneNumber(pastedText)
    onChange(formatted)
  }

  const displayValue = value.startsWith('+254') ? value.substring(4) : value.replace(/[^0-9]/g, '')

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">
        +254
      </div>
      <input
        type="tel"
        value={displayValue}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`pl-16 ${className || 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent'}`}
        maxLength={9}
      />
    </div>
  )
}