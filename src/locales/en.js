/**
 * English Language File
 * All UI texts are defined here
 */

export const en = {
  // Common
  common: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    search: "Search",
    filter: "Filter",
    clear: "Clear",
    close: "Close",
    loading: "Loading...",
    noData: "No data found",
    yes: "Yes",
    no: "No",
    confirm: "Confirm",
    back: "Back",
    next: "Next",
    submit: "Submit",
    update: "Update",
    view: "View",
    download: "Download",
    upload: "Upload",
    select: "Select",
    selectAll: "Select All",
    required: "Required",
    optional: "Optional",
  },

  // Gate Options
  gates: {
    yellow: "YELLOW",
    red: "RED",
    select: "Select Line",
    legend: "Line Colors",
  },

  // Transaction Status
  status: {
    pending: "Pending",
    inProgress: "In Progress",
    inspection: "Inspection",
    completed: "Completed",
    withdrawn: "Withdrawn",
    cancelled: "Cancelled",
  },

  // User Roles
  roles: {
    superAdmin: "Super Admin",
    brokerAdmin: "Broker Admin",
    brokerUser: "Broker User",
    clientUser: "Client User",
  },

  // Company Types
  companyTypes: {
    customsBroker: "Customs Broker",
    client: "Client Company",
  },

  // Transaction Fields
  transaction: {
    title: "Transactions",
    addNew: "Add New Transaction",
    edit: "Edit Transaction",
    details: "Transaction Details",
    fileNo: "File No",
    recipient: "Recipient",
    sender: "Sender",
    customsWarehouse: "Customs Warehouse",
    customsName: "Customs",
    gate: "Line",
    containerAmount: "Container Amount",
    weight: "Weight (Kg)",
    tax: "Tax",
    warehouseArrivalDate: "Warehouse Arrival Date",
    registrationDate: "Registration Date",
    declarationNumber: "Declaration Number",
    lineClosureDate: "Line Closure Date",
    importProcessingTime: "Import Processing Time (Days)",
    withdrawalDate: "Withdrawal Date",
    description: "Description",
    delayReason: "Delay Reason",
    brokerCompany: "Broker Company",
    clientCompany: "Client Company",
  },

  // Company Fields
  company: {
    title: "Companies",
    addNew: "Add New Company",
    name: "Company Name",
    shortName: "Short Name",
    description: "Description",
    type: "Company Type",
  },

  // User Fields
  user: {
    title: "Users",
    addNew: "Add New User",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    phone: "Phone",
    role: "Role",
    company: "Company",
  },

  // Employee Management
  employee: {
    title: "Employees",
    addNew: "Add New Employee",
    edit: "Edit Employee",
    delete: "Delete Employee",
    details: "Employee Details",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    password: "Password",
    role: "Role",
    status: "Status",
    createdAt: "Registration Date",
    lastLogin: "Last Login",
    company: "Company",
    quota: "Usage",
    quotaExceeded: "Employee limit reached",
    cannotDeleteSelf: "You cannot delete your own account",
    cannotDeleteLastAdmin: "Cannot delete the last BROKER_ADMIN user",
    selectCompany: "Select Broker Company",

    roles: {
      brokerAdmin: "Broker Administrator",
      brokerUser: "Broker User",
    },

    statuses: {
      active: "Active",
      pending: "Pending",
    },

    messages: {
      createSuccess: "Employee added successfully!",
      updateSuccess: "Employee information updated successfully!",
      deleteSuccess: "Employee deleted successfully!",
      createError: "Failed to create employee",
      updateError: "Failed to update employee",
      deleteError: "Failed to delete employee",
    },

    placeholders: {
      searchEmployees: "Search by name or email...",
      firstName: "JOHN",
      lastName: "DOE",
      email: "john.doe@example.com",
      password: "At least 6 characters",
    },
  },

  // Form Messages
  messages: {
    saveSuccess: "Saved successfully",
    saveError: "Save error",
    deleteSuccess: "Deleted successfully",
    deleteError: "Delete error",
    updateSuccess: "Updated successfully",
    updateError: "Update error",
    confirmDelete: "Are you sure you want to delete?",
    requiredField: "This field is required",
    invalidEmail: "Invalid email address",
    invalidPhone: "Invalid phone number",
  },

  // Placeholder Texts
  placeholders: {
    search: "Search...",
    selectCompany: "Select company...",
    selectGate: "Select line...",
    enterFileNo: "Enter file no",
    enterDeclarationNumber: "Enter declaration number",
    enterCustomsWarehouse: "Enter customs warehouse",
    enterCustomsName: "Enter customs name",
    enterContainerAmount: "Enter container amount",
    enterSender: "Enter sender",
    enterWeight: "Enter weight",
    enterTax: "Enter tax",
    enterImportProcessingTime: "Enter processing time",
    enterName: "Enter name",
    enterEmail: "Enter email",
    enterDescription: "Enter description...",
    typeToSearch: "Type to search...",
    selectOrType: "Select or type...",
    enterDelayReason: "Specify potential delay reasons...",
    firstSelectClient: "First select client company",
  },

  // Time related
  time: {
    today: "Today",
    yesterday: "Yesterday",
    thisWeek: "This Week",
    thisMonth: "This Month",
    lastMonth: "Last Month",
    custom: "Custom Date",
  },

  // Navigation
  nav: {
    dashboard: "Dashboard",
    transactions: "Transactions",
    companies: "Companies",
    users: "Users",
    reports: "Reports",
    settings: "Settings",
    logout: "Logout",
  },
};

export default en;