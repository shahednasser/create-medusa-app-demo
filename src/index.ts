#!/usr/bin/env node
import { program } from 'commander'
import create from './commands/create.js'

program
  .description('Create a new Medusa project')
  .parse()

create()