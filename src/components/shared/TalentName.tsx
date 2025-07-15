import React from 'react';
import { useData } from '../../contexts/DataContext';

interface TalentNameProps {
  name: string;
  onTalentClick?: (person: any) => void;
  className?: string;
}

const TalentName: React.FC<TalentNameProps> = ({ name, onTalentClick, className = '' }) => {
  const { people, getPersonByName } = useData();
  
  // Check if this person exists in the DataContext (has a guest card)
  const person = getPersonByName(name);
  
  if (person && onTalentClick) {
    // Person has a guest card - make it clickable
    return (
      <button
        onClick={() => onTalentClick(person)}
        className={`text-blue-600 hover:text-blue-800 hover:underline cursor-pointer ${className}`}
        title={`View ${person.name}'s guest card`}
      >
        {name}
      </button>
    );
  } else {
    // Person doesn't have a guest card - render as static text
    return (
      <span className={className}>
        {name}
      </span>
    );
  }
};

export default TalentName;