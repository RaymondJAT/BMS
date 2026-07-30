const express = require('express')
const {
  getBudgetBudget,
  upsertBudgetBudget,
  getBudgetHistory,
  softDeleteBudget,
} = require('../controllers/budget-budget.controller')

const budgetBudgetRouter = express.Router()

budgetBudgetRouter.get('/', getBudgetBudget)
budgetBudgetRouter.post('/', upsertBudgetBudget)
budgetBudgetRouter.get('/history', getBudgetHistory)
budgetBudgetRouter.delete('/:id', softDeleteBudget)

module.exports = {
  budgetBudgetRouter,
}
