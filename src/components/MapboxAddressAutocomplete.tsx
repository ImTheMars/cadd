import React, { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { MapPin } from 'lucide-react';

interface MapboxAddressAutocompleteProps {
  label?: string;
  value: string;
  onChange: (value: string, coordinates?: [number, number]) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

interface Suggestion {
  text: string;
  place_name: string;
  center: [number, number];
}

const MapboxAddressAutocomplete: React.FC<MapboxAddressAutocompleteProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Enter an address',
  error,
  required = false,
  className = ''
}) => {
  const [showMinimap, setShowMinimap] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] = useState<[number, number] | undefined>();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use the same token as in the NewOrder page
  const accessToken = 'pk.eyJ1Ijoic2FtY2hpc2ljayIsImEiOiJjbTk5a3pweHcwZTJlMm1vYjNzeGoxbGgwIn0.HMaDZt0ucB2DsnrJS7nMVw';

  // Handle manual input
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue);
    
    if (inputValue.trim() !== '') {
      setShowSuggestions(true);
      fetchSuggestionsImmediate(inputValue);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setShowMinimap(false);
    }
  };
  
  // Direct fetch without debounce for immediate response
  const fetchSuggestionsImmediate = async (query: string) => {
    if (!query || query.trim() === '') return;
    
    setLoading(true);
    try {
      // Direct Mapbox Geocoding API call
      const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`;
      const params = new URLSearchParams({
        access_token: accessToken,
        autocomplete: 'true',
        country: 'us',
        types: 'address,place',
        limit: '5',
        proximity: '-117.8311,33.7175' // Orange County, CA coordinates
      });
      
      const response = await fetch(`${endpoint}?${params}`);
      if (!response.ok) {
        throw new Error(`Mapbox API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.features && Array.isArray(data.features)) {
        const mappedSuggestions = data.features.map((feature: any) => ({
          text: feature.text || '',
          place_name: feature.place_name || '',
          center: feature.center as [number, number]
        }));
        setSuggestions(mappedSuggestions);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: Suggestion) => {
    onChange(suggestion.place_name, suggestion.center);
    setSelectedCoordinates(suggestion.center);
    setShowSuggestions(false);
    setShowMinimap(true);
    
    // Focus the input after selection
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Handle key navigation in suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); // Prevent scrolling
      // Implementation for keyboard navigation would go here
    } else if (e.key === 'Enter' && suggestions.length > 0) {
      handleSuggestionClick(suggestions[0]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };
  
  // Handle blur event
  const handleAddressBlur = () => {
    // Small delay to allow click events on suggestions
    setTimeout(() => {
      setShowSuggestions(false);
      
      // If we have a value but no minimap showing yet, show it
      if (value && value.trim() !== '' && !showMinimap && selectedCoordinates) {
        setShowMinimap(true);
      }
    }, 150);
  };

  return (
    <div className={`mb-4 ${className}`} ref={containerRef}>
      {label && (
        <label className="block mb-2 text-sm font-medium text-text-primary">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onBlur={handleAddressBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          className={`w-full bg-background-light border-2 px-4 py-2 rounded-md text-text-primary
            placeholder:text-text-secondary focus:outline-none focus:border-accent transition-colors
            ${error ? 'border-red-500' : 'border-background-light'}`}
          autoComplete="off"
        />
        
        {/* Map pin icon */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary">
          {loading ? (
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <MapPin size={16} />
          )}
        </div>
        
        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-background border border-background-light rounded-md shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div 
                key={index}
                className="px-4 py-2 hover:bg-background-light cursor-pointer border-b border-background-light last:border-0"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="flex items-start">
                  <MapPin size={14} className="mt-0.5 mr-2 flex-shrink-0 text-accent" />
                  <div>
                    <div className="text-sm text-text-primary">{suggestion.place_name}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
      
      {/* Show mini map when address is entered */}
      {showMinimap && (
        <div className="mt-2 h-[150px] rounded-md overflow-hidden bg-gray-800 flex items-center justify-center">
          <div className="text-center">
            <MapPin size={24} className="mx-auto mb-2 text-accent" />
            <p className="text-sm text-text-secondary">Map preview would appear here</p>
            <p className="text-xs text-accent mt-1">{value}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapboxAddressAutocomplete;
