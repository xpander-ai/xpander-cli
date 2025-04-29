export enum CommandType {
  Configure = 'configure',
  Profile = 'profile',
  Agent = 'agent',
  Interfaces = 'interfaces',
  Operations = 'operations',
  Login = 'login',
  Interactive = 'interactive',
  Graph = 'graph',
  View = 'View',
  ListJson = 'list-json',
  Tools = 'tools',
  Initialize = 'initialize',
  Deploy = 'deploy',
  Logs = 'logs',
  Exit = 'exit',
  // Crud
  List = 'list',
  Get = 'get',
  New = 'new',
  Create = 'create',
  Delete = 'delete',
  Update = 'update',
}

export const allCommands = Object.values(CommandType) as string[];
