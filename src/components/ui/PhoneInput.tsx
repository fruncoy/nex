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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/[^0-9]/g, '') // Remove non-digits
    
    // Auto-format to +254
    if (input.length > 0) {
      // Remove any existing 254 prefix
      if (input.startsWith('254')) {
        input = input.substring(3)
      }
      // Remove leading 0
      if (input.startsWith('0')) {
        input = input.substring(1)
      }
      // Ensure it starts with 7, 1, or other valid Kenyan prefixes
      if (input.length > 0 && input.match(/^[71]/)) {
        onChange('+254' + input)
      } else if (input.length > 0) {
        // For other numbers, still add +254 but let validation handle it
        onChange('+254' + input)
      } else {
        onChange('')
      }
    } else {
      onChange('')
    }
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
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`pl-16 ${className || 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent'}`}
        maxLength={9}
      />
    </div>
  )
}