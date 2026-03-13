export type SessionPermission = {
  _id?: string;
  resource: string;
  action: string;
  name?: string;
};

export type SessionRole = {
  _id?: string;
  name?: string;
  nameAr?: string;
  permissions?: SessionPermission[];
};
