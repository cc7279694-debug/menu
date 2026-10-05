package app.recipio.local;

import java.util.Arrays;

/** Native input boundary; encrypted storage continues to use AiSecretEnvelope's strict validator. */
final class AiKeyInput {
    enum Problem {
        EMPTY("请粘贴完整的百炼 API Key"),
        PREFIX("请使用小写 sk- 开头的完整 API Key，不要带引号或 Bearer"),
        TOO_SHORT("复制的内容太短，请复制完整 API Key"),
        TOO_LONG("复制的内容过长，请仅复制 API Key"),
        MASKED("这是打码后的显示值，请复制完整 API Key，不要复制星号或省略号"),
        INTERNAL_WHITESPACE_OR_INVISIBLE("密钥中间有空白或不可见字符，请重新复制完整 API Key"),
        INVALID_CHARACTER("密钥包含不支持的字符，请仅复制完整 API Key");

        final String message;
        Problem(String message) { this.message = message; }
    }

    static final class InvalidInput extends Exception {
        final Problem problem;
        InvalidInput(Problem problem) { super(problem.message); this.problem = problem; }
    }

    private AiKeyInput() {}

    private static boolean boundary(char c) {
        // Clipboard-only boundary tolerance: never remove these from the key body.
        return Character.isWhitespace(c) || Character.isSpaceChar(c) || c == '\ufeff' || c == '\u200b';
    }

    static char[] prepare(CharSequence source) throws InvalidInput {
        if (source == null) throw new InvalidInput(Problem.EMPTY);
        int start = 0, end = source.length();
        while (start < end && boundary(source.charAt(start))) start++;
        while (end > start && boundary(source.charAt(end - 1))) end--;
        if (start == end) throw new InvalidInput(Problem.EMPTY);
        if (end - start > 512) throw new InvalidInput(Problem.TOO_LONG);

        // Do not make an immutable String containing the user's plaintext input.
        char[] value = new char[end - start];
        boolean accepted = false;
        try {
            for (int i = 0; i < value.length; i++) value[i] = source.charAt(start + i);
            if (value.length < 3 || value[0] != 's' || value[1] != 'k' || value[2] != '-')
                throw new InvalidInput(Problem.PREFIX);
            for (char c : value) {
                if (c == '*' || c == '•' || c == '●' || c == '…') throw new InvalidInput(Problem.MASKED);
                if (boundary(c) || Character.isISOControl(c) || Character.getType(c) == Character.FORMAT)
                    throw new InvalidInput(Problem.INTERNAL_WHITESPACE_OR_INVISIBLE);
                if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
                      (c >= '0' && c <= '9') || c == '-' || c == '_'))
                    throw new InvalidInput(Problem.INVALID_CHARACTER);
            }
            if (value.length < 20) throw new InvalidInput(Problem.TOO_SHORT);
            try { AiSecretEnvelope.validate(value); }
            catch (Exception ignored) { throw new InvalidInput(Problem.INVALID_CHARACTER); }
            accepted = true;
            return value;
        } finally {
            if (!accepted) Arrays.fill(value, '\0');
        }
    }
}
