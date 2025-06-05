  <Textarea
    value={prompt}
    onChange={(e) => setPrompt(e.target.value)}
    placeholder="Suggest a prompt..."
    className=""
  />
  <div className="flex gap-2 mt-4">
    <Button
      onClick={handleSubmit}
      disabled={!prompt.trim() || loading}
      className="btn-primary w-full"
    >
      {loading ? 'Submitting...' : 'Submit'}
    </Button>
    <Button
      onClick={onClose}
      className="btn-secondary w-full"
    >
      Cancel
    </Button>
  </div> 