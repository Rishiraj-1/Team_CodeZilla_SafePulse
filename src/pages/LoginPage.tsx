import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import ParticleField from "@/components/ParticleField";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";


interface InputFieldProps {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  focused: string | null;
  onFocus: () => void;
  onBlur: () => void;
  id: string;
}

const InputField = ({
  label,
  type,
  value,
  onChange,
  placeholder,
  focused,
  onFocus,
  onBlur,
  id,
}: InputFieldProps) => {
  const isFocused = focused === id;
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium mb-1.5"
        style={{
          color: isFocused ? "#b787f5" : "rgba(245,245,245,0.4)",
          transition: "color 0.2s",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={onFocus}
        onBlur={onBlur}
        autoComplete={type === "password" ? "current-password" : type === "email" ? "email" : "name"}
        className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
        style={{
          background: isFocused
            ? "rgba(183,135,245,0.06)"
            : "rgba(255,255,255,0.04)",
          border: isFocused
            ? "1px solid rgba(183,135,245,0.4)"
            : "1px solid rgba(255,255,255,0.07)",
          color: "#f5f5f5",
          boxShadow: isFocused
            ? "0 0 20px rgba(183,135,245,0.08)"
            : "none",
        }}
      />
    </div>
  );
};


