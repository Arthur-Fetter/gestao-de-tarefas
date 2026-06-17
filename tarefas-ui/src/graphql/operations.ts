import { gql } from 'urql'

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user { id email name role }
    }
  }
`

export const REGISTER_MUTATION = gql`
  mutation Register($name: String!, $email: String!, $password: String!, $role: String) {
    register(name: $name, email: $email, password: $password, role: $role) {
      token
      user { id email name role }
    }
  }
`

export const ME_QUERY = gql`
  query Me {
    me { id email name role }
  }
`

export const USERS_QUERY = gql`
  query Users {
    users { id name email role }
  }
`

export const TASKS_QUERY = gql`
  query Tasks($assignedTo: ID) {
    tasks(assignedTo: $assignedTo) {
      id
      title
      description
      status
      assignedTo
      assigneeName
      assigneeEmail
      createdAt
      updatedAt
    }
  }
`

export const CREATE_TASK_MUTATION = gql`
  mutation CreateTask($input: CreateTaskInput!) {
    createTask(input: $input) {
      id
      title
      description
      status
      assignedTo
      assigneeName
      assigneeEmail
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_TASK_MUTATION = gql`
  mutation UpdateTask($id: ID!, $input: UpdateTaskInput!) {
    updateTask(id: $id, input: $input) {
      id
      title
      description
      status
      assignedTo
      assigneeName
      assigneeEmail
      createdAt
      updatedAt
    }
  }
`

export const DELETE_TASK_MUTATION = gql`
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id)
  }
`
