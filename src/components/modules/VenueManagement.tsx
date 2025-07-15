import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Edit3, MapPin, Users, Building, 
  X, Trash2, AlertTriangle
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';

interface House {
  id: number;
  name: string;
  capacity?: number;
}

interface Venue {
  id: number;
  name: string;
  address: string;
  color: string;
  houses: House[];
  isTBD?: boolean;
}

interface User {
  id: number;
  name: string;
  role: string;
  permissions: Record<string, string>;
}

interface VenueManagementProps {
  user: User;
}

const VenueManagement: React.FC<VenueManagementProps> = ({ user }) => {
  const { venues } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [newVenue, setNewVenue] = useState({
    name: '',
    address: '',
    color: '#3B82F6',
    houses: [{ name: '', capacity: '' }]
  });

  const [editVenue, setEditVenue] = useState({
    name: '',
    address: '',
    color: '#3B82F6',
    houses: [{ name: '', capacity: '' }]
  });

  // Color palette for venues
  const colorOptions = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];


  const filteredVenues = venues.filter(venue =>
    venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    venue.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddHouse = () => {
    setNewVenue(prev => ({
      ...prev,
      houses: [...prev.houses, { name: '', capacity: '' }]
    }));
  };

  const handleRemoveHouse = (index: number) => {
    setNewVenue(prev => ({
      ...prev,
      houses: prev.houses.filter((_, i) => i !== index)
    }));
  };

  const handleHouseChange = (index: number, field: string, value: string) => {
    setNewVenue(prev => ({
      ...prev,
      houses: prev.houses.map((house, i) => 
        i === index ? { ...house, [field]: value } : house
      )
    }));
  };

  // Edit venue functions
  const handleEditHouseChange = (index: number, field: string, value: string) => {
    setEditVenue(prev => ({
      ...prev,
      houses: prev.houses.map((house, i) => 
        i === index ? { ...house, [field]: value } : house
      )
    }));
  };

  const handleAddEditHouse = () => {
    setEditVenue(prev => ({
      ...prev,
      houses: [...prev.houses, { name: '', capacity: '' }]
    }));
  };

  const handleRemoveEditHouse = (index: number) => {
    setEditVenue(prev => ({
      ...prev,
      houses: prev.houses.filter((_, i) => i !== index)
    }));
  };

  const openEditModal = (venue: Venue) => {
    setSelectedVenue(venue);
    setEditVenue({
      name: venue.name,
      address: venue.address,
      color: venue.color,
      houses: venue.houses.map(house => ({
        name: house.name,
        capacity: house.capacity?.toString() || ''
      }))
    });
    setShowEditModal(true);
  };

  const handleUpdateVenue = () => {
    if (!editVenue.name || !editVenue.address || !selectedVenue) {
      alert('Please fill in venue name and address');
      return;
    }

    const validHouses = editVenue.houses.filter(house => house.name.trim() !== '');
    if (validHouses.length === 0) {
      alert('Please add at least one house/space');
      return;
    }

    const updatedVenue: Venue = {
      ...selectedVenue,
      name: editVenue.name.trim(),
      address: editVenue.address.trim(),
      color: editVenue.color,
      houses: validHouses.map((house, index) => ({
        id: index + 1,
        name: house.name.trim(),
        capacity: house.capacity ? parseInt(house.capacity) : undefined
      }))
    };

    setVenues(prev => prev.map(venue => 
      venue.id === selectedVenue.id ? updatedVenue : venue
    ));

    setShowEditModal(false);
    setSelectedVenue(null);
  };

  const handleAddVenue = () => {
    if (!newVenue.name || !newVenue.address) {
      alert('Please fill in venue name and address');
      return;
    }

    const validHouses = newVenue.houses.filter(house => house.name.trim() !== '');
    if (validHouses.length === 0) {
      alert('Please add at least one house/space');
      return;
    }

    const venueToAdd: Venue = {
      id: Math.max(...venues.map(v => v.id)) + 1,
      name: newVenue.name.trim(),
      address: newVenue.address.trim(),
      color: newVenue.color,
      houses: validHouses.map((house, index) => ({
        id: index + 1,
        name: house.name.trim(),
        capacity: house.capacity ? parseInt(house.capacity) : undefined
      }))
    };

    setVenues(prev => [...prev, venueToAdd]);
    setNewVenue({
      name: '',
      address: '',
      color: '#3B82F6',
      houses: [{ name: '', capacity: '' }]
    });
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Venue Management</h1>
          <p className="text-gray-600">Manage festival venues and spaces</p>
        </div>
        {user.permissions.venueManagement === 'full_edit' && (
          <button 
            type="button"
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Venue
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search venues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Venues List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVenues.map((venue) => (
          <div
            key={venue.id}
            className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow ${
              venue.isTBD ? 'border-2 border-red-200 bg-red-50' : ''
            }`}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div 
                    className="w-4 h-4 rounded-full mr-3 flex-shrink-0"
                    style={{ backgroundColor: venue.color }}
                  ></div>
                  <div>
                    <h3 className={`font-semibold text-gray-900 ${venue.isTBD ? 'text-red-800' : ''}`}>
                      {venue.name}
                      {venue.isTBD && (
                        <AlertTriangle className="w-4 h-4 inline ml-2 text-red-500" />
                      )}
                    </h3>
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <MapPin className="w-3 h-3 mr-1" />
                      {venue.address}
                    </div>
                  </div>
                </div>
                {user.permissions.venueManagement === 'full_edit' && !venue.isTBD && (
                  <button 
                    onClick={() => openEditModal(venue)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">
                  Houses/Spaces ({venue.houses.length})
                </div>
                {venue.houses.map((house) => (
                  <div key={house.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <Building className="w-3 h-3 mr-2 text-gray-400" />
                      <span className="text-sm font-medium">{house.name}</span>
                    </div>
                    {house.capacity && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-3 h-3 mr-1" />
                        {house.capacity}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Venue Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">Add Venue</h2>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name *</label>
                    <input 
                      type="text" 
                      value={newVenue.name}
                      onChange={(e) => setNewVenue(prev => ({...prev, name: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                      placeholder="e.g., AMC River East 21"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                    <input 
                      type="text" 
                      value={newVenue.address}
                      onChange={(e) => setNewVenue(prev => ({...prev, address: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                      placeholder="e.g., 322 E Illinois St, Chicago, IL 60611"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                    <div className="flex gap-2">
                      {colorOptions.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewVenue(prev => ({...prev, color}))}
                          className={`w-8 h-8 rounded-full border-2 ${
                            newVenue.color === color ? 'border-gray-800' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Houses */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">Houses/Spaces *</label>
                    <button
                      type="button"
                      onClick={handleAddHouse}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add House
                    </button>
                  </div>
                  
                  {newVenue.houses.map((house, index) => (
                    <div key={index} className="grid grid-cols-3 gap-3 mb-3">
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="House/Space name (e.g., Theater 1, Main Room)"
                          value={house.name}
                          onChange={(e) => handleHouseChange(index, 'name', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Capacity (optional)"
                          value={house.capacity}
                          onChange={(e) => handleHouseChange(index, 'capacity', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                        {newVenue.houses.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveHouse(index)}
                            className="text-red-600 hover:text-red-800 p-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddVenue}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Add Venue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Venue Modal */}
      {showEditModal && selectedVenue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">Edit Venue</h2>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name *</label>
                    <input 
                      type="text" 
                      value={editVenue.name}
                      onChange={(e) => setEditVenue(prev => ({...prev, name: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                      placeholder="e.g., AMC River East 21"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                    <input 
                      type="text" 
                      value={editVenue.address}
                      onChange={(e) => setEditVenue(prev => ({...prev, address: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                      placeholder="e.g., 322 E Illinois St, Chicago, IL 60611"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                    <div className="flex gap-2">
                      {colorOptions.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setEditVenue(prev => ({...prev, color}))}
                          className={`w-8 h-8 rounded-full border-2 ${
                            editVenue.color === color ? 'border-gray-800' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Houses */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">Houses/Spaces *</label>
                    <button
                      type="button"
                      onClick={handleAddEditHouse}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add House
                    </button>
                  </div>
                  
                  {editVenue.houses.map((house, index) => (
                    <div key={index} className="grid grid-cols-3 gap-3 mb-3">
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="House/Space name (e.g., Theater 1, Main Room)"
                          value={house.name}
                          onChange={(e) => handleEditHouseChange(index, 'name', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Capacity (optional)"
                          value={house.capacity}
                          onChange={(e) => handleEditHouseChange(index, 'capacity', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                        {editVenue.houses.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEditHouse(index)}
                            className="text-red-600 hover:text-red-800 p-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateVenue}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Update Venue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueManagement;