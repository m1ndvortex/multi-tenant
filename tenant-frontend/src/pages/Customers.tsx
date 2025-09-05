import React, { useState } from 'react';
import CustomerList from '@/components/customers/CustomerList';
import CustomerForm from '@/components/customers/CustomerForm';
import CustomerProfile from '@/components/customers/CustomerProfile';
import CustomerSegmentation from '@/components/customers/CustomerSegmentation';
import { Customer } from '@/services/customerService';
import { useToast } from '@/hooks/use-toast';

type ViewMode = 'list' | 'create' | 'edit' | 'profile' | 'segmentation';

const Customers: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setViewMode('profile');
  };

  const handleCreateCustomer = () => {
    setSelectedCustomer(null);
    setViewMode('create');
  };

  const handleEditCustomer = () => {
    if (selectedCustomer) {
      setViewMode('edit');
    }
  };

  const handleDeleteCustomer = () => {
    if (selectedCustomer) {
      // Show confirmation dialog
      if (window.confirm(`آیا از حذف مشتری "${selectedCustomer.display_name}" اطمینان دارید؟`)) {
        // TODO: Implement delete functionality
        toast({
          title: 'موفقیت',
          description: 'مشتری با موفقیت حذف شد',
        });
        setViewMode('list');
        setSelectedCustomer(null);
      }
    }
  };

  const handleSaveCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setViewMode('profile');
  };

  const handleCancel = () => {
    if (selectedCustomer && viewMode === 'profile') {
      setViewMode('profile');
    } else {
      setViewMode('list');
    }
    if (viewMode === 'create') {
      setSelectedCustomer(null);
    }
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedCustomer(null);
  };

  const handleShowSegmentation = () => {
    setViewMode('segmentation');
  };

  return (
    <div className="space-y-6">
      {viewMode === 'list' && (
        <CustomerList
          onSelectCustomer={handleSelectCustomer}
          onCreateCustomer={handleCreateCustomer}
          onShowSegmentation={handleShowSegmentation}
        />
      )}

      {(viewMode === 'create' || viewMode === 'edit') && (
        <CustomerForm
          customer={viewMode === 'edit' ? selectedCustomer || undefined : undefined}
          onSave={handleSaveCustomer}
          onCancel={handleCancel}
        />
      )}

      {viewMode === 'profile' && selectedCustomer && (
        <CustomerProfile
          customer={selectedCustomer}
          onEdit={handleEditCustomer}
          onDelete={handleDeleteCustomer}
          onBack={handleBackToList}
        />
      )}

      {viewMode === 'segmentation' && (
        <CustomerSegmentation
          onBack={handleBackToList}
        />
      )}
    </div>
  );
};

export default Customers;