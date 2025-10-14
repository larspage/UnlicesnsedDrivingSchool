import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  ParsedColorScheme,
  parseColorSchemeFile,
  createCSSVariables,
  createTailwindColors,
  isValidColorSchemeFile
} from '../utils/colorSchemeParser';

export interface ColorSchemeContextType {
  currentColorScheme: ParsedColorScheme | null;
  availableColorSchemes: ParsedColorScheme[];
  isLoading: boolean;
  error: string | null;
  applyColorScheme: (colorScheme: ParsedColorScheme) => void;
  loadColorSchemeFromFile: (file: File) => Promise<void>;
  loadColorSchemeFromContent: (content: string, fileName: string) => Promise<void>;
  resetToDefault: () => void;
  saveColorScheme: (colorScheme: ParsedColorScheme) => void;
  deleteColorScheme: (id: string) => void;
}

const ColorSchemeContext = createContext<ColorSchemeContextType | undefined>(undefined);

const STORAGE_KEY = 'njdsc-color-schemes';
const CURRENT_SCHEME_KEY = 'njdsc-current-color-scheme';

const defaultColorScheme: ParsedColorScheme = {
  id: 'default-dull-orange',
  name: 'Dull Orange',
  colors: {
    'lapis-lazuli': {
      hex: '#2660a4ff',
      hsl: 'hsla(212, 62%, 40%, 1)',
      rgb: '38 96 164',
    },
    'azure-web': {
      hex: '#edf7f6ff',
      hsl: 'hsla(174, 38%, 95%, 1)',
      rgb: '237 247 246',
    },
    'sandy-brown': {
      hex: '#f19953ff',
      hsl: 'hsla(27, 85%, 64%, 1)',
      rgb: '241 153 83',
    },
    'copper': {
      hex: '#c47335ff',
      hsl: 'hsla(26, 57%, 49%, 1)',
      rgb: '196 115 53',
    },
    'caf-noir': {
      hex: '#56351eff',
      hsl: 'hsla(25, 48%, 23%, 1)',
      rgb: '86 53 30',
    },
  },
  gradients: {
    'gradient-top': 'linear-gradient(0deg, #2660a4ff, #edf7f6ff, #f19953ff, #c47335ff, #56351eff)',
    'gradient-right': 'linear-gradient(90deg, #2660a4ff, #edf7f6ff, #f19953ff, #c47335ff, #56351eff)',
    'gradient-bottom': 'linear-gradient(180deg, #2660a4ff, #edf7f6ff, #f19953ff, #c47335ff, #56351eff)',
    'gradient-left': 'linear-gradient(270deg, #2660a4ff, #edf7f6ff, #f19953ff, #c47335ff, #56351eff)',
    'gradient-top-right': 'linear-gradient(45deg, #2660a4ff, #edf7f6ff, #f19953ff, #c47335ff, #56351eff)',
    'gradient-bottom-right': 'linear-gradient(135deg, #2660a4ff, #edf7f6ff, #f19953ff, #c47335ff, #56351eff)',
    'gradient-top-left': 'linear-gradient(225deg, #2660a4ff, #edf7f6ff, #f19953ff, #c47335ff, #56351eff)',
    'gradient-bottom-left': 'linear-gradient(315deg, #2660a4ff, #edf7f6ff, #f19953ff, #c47335ff, #56351eff)',
    'gradient-radial': 'radial-gradient(#2660a4ff, #edf7f6ff, #f19953ff, #c47335ff, #56351eff)',
  },
  createdAt: new Date(),
};

interface ColorSchemeProviderProps {
  children: ReactNode;
}

export function ColorSchemeProvider({ children }: ColorSchemeProviderProps) {
  const [currentColorScheme, setCurrentColorScheme] = useState<ParsedColorScheme | null>(null);
  const [availableColorSchemes, setAvailableColorSchemes] = useState<ParsedColorScheme[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load color schemes from localStorage on mount
  useEffect(() => {
    loadColorSchemesFromStorage();
  }, []);

  // Apply color scheme to CSS variables when current scheme changes
  useEffect(() => {
    if (currentColorScheme) {
      applyColorSchemeToDOM(currentColorScheme);
    }
  }, [currentColorScheme]);

  const loadColorSchemesFromStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const schemes: ParsedColorScheme[] = JSON.parse(stored);
        setAvailableColorSchemes(schemes);

        // Load current scheme
        const currentId = localStorage.getItem(CURRENT_SCHEME_KEY);
        if (currentId) {
          const current = schemes.find(scheme => scheme.id === currentId);
          if (current) {
            setCurrentColorScheme(current);
            return;
          }
        }
      }

      // If no stored schemes or no current scheme, use default
      setCurrentColorScheme(defaultColorScheme);
      setAvailableColorSchemes([defaultColorScheme]);
    } catch (err) {
      console.error('Error loading color schemes from storage:', err);
      setCurrentColorScheme(defaultColorScheme);
      setAvailableColorSchemes([defaultColorScheme]);
    }
  };

  const applyColorSchemeToDOM = (colorScheme: ParsedColorScheme) => {
    const cssVariables = createCSSVariables(colorScheme);
    const styleId = 'dynamic-color-scheme';

    // Remove existing style element if it exists
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create new style element
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = cssVariables;
    document.head.appendChild(style);
  };

  const applyColorScheme = (colorScheme: ParsedColorScheme) => {
    setCurrentColorScheme(colorScheme);
    localStorage.setItem(CURRENT_SCHEME_KEY, colorScheme.id);
  };

  const loadColorSchemeFromFile = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const content = await file.text();

      if (!isValidColorSchemeFile(content)) {
        throw new Error('Invalid color scheme file format');
      }

      const colorScheme = parseColorSchemeFile(content, file.name);
      await loadColorSchemeFromContent(content, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load color scheme');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loadColorSchemeFromContent = async (content: string, fileName: string) => {
    if (!isValidColorSchemeFile(content)) {
      throw new Error('Invalid color scheme file format');
    }

    const colorScheme = parseColorSchemeFile(content, fileName);

    // Add to available schemes
    const updatedSchemes = [...availableColorSchemes.filter(s => s.id !== colorScheme.id), colorScheme];
    setAvailableColorSchemes(updatedSchemes);

    // Apply as current scheme
    applyColorScheme(colorScheme);

    // Save to storage
    saveColorSchemesToStorage(updatedSchemes);
  };

  const saveColorScheme = (colorScheme: ParsedColorScheme) => {
    const updatedSchemes = [
      ...availableColorSchemes.filter(s => s.id !== colorScheme.id),
      colorScheme,
    ];
    setAvailableColorSchemes(updatedSchemes);
    saveColorSchemesToStorage(updatedSchemes);
  };

  const deleteColorScheme = (id: string) => {
    const updatedSchemes = availableColorSchemes.filter(s => s.id !== id);
    setAvailableColorSchemes(updatedSchemes);

    // If deleting current scheme, reset to default
    if (currentColorScheme?.id === id) {
      const defaultScheme = updatedSchemes.find(s => s.id === 'default-dull-orange') || updatedSchemes[0];
      if (defaultScheme) {
        applyColorScheme(defaultScheme);
      }
    }

    saveColorSchemesToStorage(updatedSchemes);
  };

  const resetToDefault = () => {
    applyColorScheme(defaultColorScheme);
  };

  const saveColorSchemesToStorage = (schemes: ParsedColorScheme[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(schemes));
    } catch (err) {
      console.error('Error saving color schemes to storage:', err);
    }
  };

  const value: ColorSchemeContextType = {
    currentColorScheme,
    availableColorSchemes,
    isLoading,
    error,
    applyColorScheme,
    loadColorSchemeFromFile,
    loadColorSchemeFromContent,
    resetToDefault,
    saveColorScheme,
    deleteColorScheme,
  };

  return (
    <ColorSchemeContext.Provider value={value}>
      {children}
    </ColorSchemeContext.Provider>
  );
}

export function useColorScheme(): ColorSchemeContextType {
  const context = useContext(ColorSchemeContext);
  if (context === undefined) {
    throw new Error('useColorScheme must be used within a ColorSchemeProvider');
  }
  return context;
}