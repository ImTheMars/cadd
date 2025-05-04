import React, { useState } from 'react';
import { User, Phone, Mail, AtSign, Edit2, Save, Send } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import { Customer } from '../types/database.types';
import { supabase } from '../lib/supabase';

interface CustomerPersonalInfoProps {
  customer: Customer;
  onCustomerUpdated: (customer: Customer) => void;
}

const CustomerPersonalInfo: React.FC<CustomerPersonalInfoProps> = ({
  customer,
  onCustomerUpdated,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    phone_number: customer.phone_number || '',
    email: customer.email || '',
    snapchat_username: customer.snapchat_username || '',
    telegram_username: customer.telegram_username || '',
    notes: customer.notes || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customer.id)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      onCustomerUpdated(data);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating customer:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-background rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <User className="h-5 w-5 mr-2 text-accent" />
          Personal Information
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          isLoading={isSaving}
          disabled={isSaving}
        >
          {isEditing ? (
            <>
              <Save className="h-4 w-4 mr-1" /> Save
            </>
          ) : (
            <>
              <Edit2 className="h-4 w-4 mr-1" /> Edit
            </>
          )}
        </Button>
      </div>

      <div className="space-y-4">
        {isEditing ? (
          <>
            <Input
              label="Snapchat Username"
              name="snapchat_username"
              value={formData.snapchat_username}
              onChange={handleChange}
              fullWidth
            />
            <Input
              label="Phone Number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              fullWidth
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              fullWidth
            />
            <Input
              label="Telegram Username"
              name="telegram_username"
              value={formData.telegram_username}
              onChange={handleChange}
              fullWidth
            />
            <div>
              <label className="block mb-2 text-sm font-medium text-text-primary">
                Notes
              </label>
              <textarea
                name="notes"
                className="w-full bg-background-light border-2 border-background-light rounded-md p-2 text-text-primary resize-none focus:outline-none focus:border-accent"
                rows={3}
                value={formData.notes}
                onChange={handleChange}
              ></textarea>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-background-light p-3 rounded-lg">
              <div className="flex items-center text-text-secondary text-sm mb-1">
                <AtSign className="h-3.5 w-3.5 mr-1" /> Snapchat
              </div>
              <div className="font-medium">{customer.snapchat_username || 'Not provided'}</div>
            </div>

            <div className="bg-background-light p-3 rounded-lg">
              <div className="flex items-center text-text-secondary text-sm mb-1">
                <Phone className="h-3.5 w-3.5 mr-1" /> Phone
              </div>
              <div className="font-medium">{customer.phone_number || 'Not provided'}</div>
            </div>

            <div className="bg-background-light p-3 rounded-lg">
              <div className="flex items-center text-text-secondary text-sm mb-1">
                <Mail className="h-3.5 w-3.5 mr-1" /> Email
              </div>
              <div className="font-medium">{customer.email || 'Not provided'}</div>
            </div>

            <div className="bg-background-light p-3 rounded-lg">
              <div className="flex items-center text-text-secondary text-sm mb-1">
                <Send className="h-3.5 w-3.5 mr-1" /> Telegram
              </div>
              <div className="font-medium">{customer.telegram_username || 'Not provided'}</div>
            </div>

            {customer.notes && (
              <div className="bg-background-light p-3 rounded-lg md:col-span-2">
                <div className="flex items-center text-text-secondary text-sm mb-1">Notes</div>
                <div className="text-sm">{customer.notes}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerPersonalInfo;