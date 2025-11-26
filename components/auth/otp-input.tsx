"use client";

import { useRef, useState, useEffect, KeyboardEvent, ClipboardEvent } from "react";
import { cn } from "@/lib/utils";

interface OTPInputProps {
    length?: number;
    value: string;
    onChange: (value: string) => void;
    onComplete?: (value: string) => void;
    disabled?: boolean;
    error?: boolean;
    autoFocus?: boolean;
}

/**
 * OTP Input Component
 * 
 * A professional OTP input with auto-advance, paste support, and accessibility.
 * 
 * @example
 * ```tsx
 * <OTPInput
 *   value={otp}
 *   onChange={setOtp}
 *   onComplete={handleVerify}
 * />
 * ```
 */
export function OTPInput({
    length = 6,
    value,
    onChange,
    onComplete,
    disabled = false,
    error = false,
    autoFocus = true,
}: OTPInputProps) {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);

    // Initialize input refs array
    useEffect(() => {
        inputRefs.current = inputRefs.current.slice(0, length);
    }, [length]);

    // Auto-focus first input on mount
    useEffect(() => {
        if (autoFocus && inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, [autoFocus]);

    // Check if OTP is complete
    useEffect(() => {
        if (value.length === length && onComplete) {
            onComplete(value);
        }
    }, [value, length, onComplete]);

    const handleChange = (index: number, digit: string) => {
        // Only allow numeric input
        if (digit && !/^\d$/.test(digit)) return;

        const newValue = value.split("");
        newValue[index] = digit;
        const newOTP = newValue.join("").slice(0, length);

        onChange(newOTP);

        // Move to next input if digit was entered
        if (digit && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
            setActiveIndex(index + 1);
        }
    };

    const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        // Handle backspace
        if (e.key === "Backspace") {
            e.preventDefault();

            if (value[index]) {
                // Clear current input
                const newValue = value.split("");
                newValue[index] = "";
                onChange(newValue.join(""));
            } else if (index > 0) {
                // Move to previous input and clear it
                const newValue = value.split("");
                newValue[index - 1] = "";
                onChange(newValue.join(""));
                inputRefs.current[index - 1]?.focus();
                setActiveIndex(index - 1);
            }
        }

        // Handle arrow keys
        else if (e.key === "ArrowLeft" && index > 0) {
            e.preventDefault();
            inputRefs.current[index - 1]?.focus();
            setActiveIndex(index - 1);
        } else if (e.key === "ArrowRight" && index < length - 1) {
            e.preventDefault();
            inputRefs.current[index + 1]?.focus();
            setActiveIndex(index + 1);
        }

        // Handle home/end keys
        else if (e.key === "Home") {
            e.preventDefault();
            inputRefs.current[0]?.focus();
            setActiveIndex(0);
        } else if (e.key === "End") {
            e.preventDefault();
            inputRefs.current[length - 1]?.focus();
            setActiveIndex(length - 1);
        }
    };

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text/plain").trim();

        // Only accept numeric paste
        if (/^\d+$/.test(pastedData)) {
            const newValue = pastedData.slice(0, length);
            onChange(newValue);

            // Focus the next empty input or the last input
            const nextIndex = Math.min(newValue.length, length - 1);
            inputRefs.current[nextIndex]?.focus();
            setActiveIndex(nextIndex);
        }
    };

    const handleFocus = (index: number) => {
        setActiveIndex(index);
        // Select the input value on focus for easy replacement
        inputRefs.current[index]?.select();
    };

    return (
        <div className="flex gap-2 justify-center" role="group" aria-label="OTP input">
            {Array.from({ length }, (_, index) => (
                <input
                    key={index}
                    ref={(el) => {
                        inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="\d{1}"
                    maxLength={1}
                    value={value[index] || ""}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    onFocus={() => handleFocus(index)}
                    disabled={disabled}
                    aria-label={`Digit ${index + 1} of ${length}`}
                    className={cn(
                        "w-12 h-14 text-center text-2xl font-semibold",
                        "border-2 rounded-lg",
                        "transition-all duration-200",
                        "focus:outline-none focus:ring-2 focus:ring-offset-2",
                        // Default state
                        "border-border bg-background text-foreground",
                        // Focus state
                        "focus:border-primary focus:ring-primary",
                        // Error state
                        error && "border-red-500 focus:border-red-500 focus:ring-red-500",
                        // Disabled state
                        disabled && "opacity-50 cursor-not-allowed bg-muted",
                        // Active/filled state
                        value[index] && !error && "border-primary bg-primary/5",
                        // Hover state
                        !disabled && "hover:border-primary/50"
                    )}
                />
            ))}
        </div>
    );
}
